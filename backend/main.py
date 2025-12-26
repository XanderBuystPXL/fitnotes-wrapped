from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from datetime import datetime

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = "/data"  # Will be mounted in Docker
# Fallback for local dev if not in docker
if not os.path.exists(DATA_PATH) and os.path.exists("../data"):
    DATA_PATH = "../data"

def get_latest_csv():
    # Find the csv in data folder
    try:
        files = [f for f in os.listdir(DATA_PATH) if f.endswith('.csv')]
        if not files:
            return None
        # Sort by creation time or name to get latest? Name has date.
        files.sort(reverse=True)
        return os.path.join(DATA_PATH, files[0])
    except Exception as e:
        print(f"Error accessing data path: {e}")
        return None

@app.get("/api/stats")
def get_stats():
    csv_file = get_latest_csv()
    if not csv_file:
        return {"error": "No data found"}
    
    try:
        df = pd.read_csv(csv_file)
        df['Date'] = pd.to_datetime(df['Date'])
        
        # Determine year (Priority: Current Year > Most Frequent Year > Max Year)
        current_year = datetime.now().year
        year_counts = df['Date'].dt.year.value_counts()
        
        if current_year in year_counts.index:
            target_year = current_year
        elif not year_counts.empty:
            target_year = year_counts.idxmax()
        else:
            max_date = df['Date'].max()
            target_year = max_date.year
        
        df_year = df[df['Date'].dt.year == target_year].copy()
        
        if df_year.empty:
             return {"error": f"No workouts found in {target_year}"}

        # 1. Total Workouts (Unique days)
        unique_days = sorted(df_year['Date'].unique())
        total_workouts = len(unique_days)
        
        # 2. Total Volume & Reps
        # Ensure numeric types
        df_year['Weight'] = pd.to_numeric(df_year['Weight'], errors='coerce').fillna(0)
        df_year['Reps'] = pd.to_numeric(df_year['Reps'], errors='coerce').fillna(0)
        
        df_year['Volume'] = df_year['Weight'] * df_year['Reps']
        total_volume = df_year['Volume'].sum()
        total_reps = df_year['Reps'].sum()
        
        # 3. Top Exercises (by frequency of sessions)
        # Count number of unique days each exercise was performed
        exercise_daily_counts = df_year[['Date', 'Exercise']].drop_duplicates()
        top_exercises = exercise_daily_counts['Exercise'].value_counts().head(5).index.tolist()
        
        # 4. Total Sets
        total_sets = len(df_year)
        
        # 5. Heaviest Lift (Max Weight)
        max_weight_idx = df_year['Weight'].idxmax()
        max_weight_row = df_year.loc[max_weight_idx]
        heaviest_lift = {
            "exercise": max_weight_row['Exercise'],
            "weight": max_weight_row['Weight'],
            "unit": max_weight_row['Weight Unit']
        }
        
        # 6. Activity Stats
        most_active_month_num = df_year['Date'].dt.month_name().value_counts().idxmax()
        fav_category = df_year['Category'].value_counts().idxmax()
        
        # 7. Muscle Split (Category Distribution for Pie Chart)
        category_counts = df_year['Category'].value_counts().reset_index()
        category_counts.columns = ['name', 'value']
        muscle_split = category_counts.to_dict(orient='records')
        
        # 8. Weekly Heatmap (Day of Week Distribution)
        # Count unique dates per day (Sessions), not total rows (Sets)
        unique_dates_df = df_year[['Date']].drop_duplicates()
        unique_dates_df['DayOfWeek'] = unique_dates_df['Date'].dt.day_name()
        
        day_counts = unique_dates_df['DayOfWeek'].value_counts().reindex([
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
        ], fill_value=0).reset_index()
        day_counts.columns = ['day', 'count']
        weekly_activity = day_counts.to_dict(orient='records')

        # 9. Longest Streak
        longest_streak = 0
        current_streak = 0
        if unique_days:
            # Convert numpy array of datetime64 to list of Timestamps
            import numpy as np
            dates = pd.to_datetime(unique_days)
            
            current_streak = 1
            longest_streak = 1
            
            for i in range(1, len(dates)):
                diff = (dates[i] - dates[i-1]).days
                if diff == 1:
                    current_streak += 1
                else:
                    longest_streak = max(longest_streak, current_streak)
                    # Reset streak? If diff > 1 means break.
                    current_streak = 1
            longest_streak = max(longest_streak, current_streak)

        # 11. The Grinder (Hardest Day)
        daily_vol = df_year.groupby('Date')['Volume'].sum().reset_index()
        max_vol_idx = daily_vol['Volume'].idxmax()
        grinder_row = daily_vol.iloc[max_vol_idx]
        the_grinder = {
            "date": grinder_row['Date'].strftime('%B %d'),
            "volume": float(grinder_row['Volume']),
            "count": int(df_year[df_year['Date'] == grinder_row['Date']]['Exercise'].count()) 
        }

        # 12. Year Grid (Contribution Graph)
        start_date = f"{int(target_year)}-01-01"
        end_date = f"{int(target_year)}-12-31"
        all_dates = pd.date_range(start=start_date, end=end_date)
        
        # Count sessions: if Time exists, count unique times. Else 1 per day.
        if 'Time' in df_year.columns and not df_year['Time'].isna().all():
             daily_counts = df_year.groupby('Date')['Time'].nunique().reindex(all_dates, fill_value=0)
        else:
             # Just presence (1 if active)
             present = df_year['Date'].unique()
             daily_counts = pd.Series(1, index=present).reindex(all_dates, fill_value=0)

        daily_vols = df_year.groupby('Date')['Volume'].sum().reindex(all_dates, fill_value=0)
        
        year_grid = []
        for date, count in daily_counts.items():
            vol = daily_vols[date]
            level = 0
            if count > 0:
                level = 1
                if vol > daily_vols.max() * 0.25: level = 2
                if vol > daily_vols.max() * 0.50: level = 3
                if vol > daily_vols.max() * 0.75: level = 4
            
            year_grid.append({
                "date": date.strftime('%Y-%m-%d'),
                "count": int(count),
                "volume": float(vol),
                "level": level
            })
            
        # 13. Badges (Interactive)
        badges = []
        df_year['DayOfWeek'] = df_year['Date'].dt.day_name()
        
        # Weekend Warrior
        weekend_workouts = df_year[df_year['DayOfWeek'].isin(['Saturday', 'Sunday'])].groupby('Date').ngroups
        if total_workouts > 0 and (weekend_workouts / total_workouts) > 0.4:
            badges.append({"name": "Weekend Warrior", "desc": "More than 40% of your sessions were on weekends. The grind doesn't stop."})
            
        # Consistency King
        if outstanding_streak := longest_streak > 7:
            badges.append({"name": "Consistency King", "desc": f"You hit the gym for {longest_streak} days in a row. Unstoppable."})
            
        # Volume Vulture
        if total_volume > 100000:
            badges.append({"name": "Volume Vulture", "desc": "You moved over 100,000 kg this year. That is a lot of gravity denied."})
        
        # Category Badges
        if fav_category == "Chest": badges.append({"name": "Chest Bra", "desc": "Chest was your #1 priority. Everyday is chest day."})
        if fav_category == "Legs": badges.append({"name": "Leg Day Enjoyer", "desc": "Legs was your top category. You don't skip the hard stuff."})
        if fav_category == "Arms": badges.append({"name": "Curl Bro", "desc": "Arms were your favorite. Sun's out guns out."})
        
        # Early Bird / Night Owl
        if 'Time' in df_year.columns and not df_year['Time'].isna().all():
             try:
                 hours = pd.to_datetime(df_year['Time'], format='%H:%M:%S', errors='coerce').dt.hour
                 avg_hour = hours.mean()
                 if avg_hour < 9: badges.append({"name": "Early Bird", "desc": "You average workout time is in the AM. Rising and grinding."})
                 if avg_hour > 20: badges.append({"name": "Night Owl", "desc": "You train late at night. The gym is your sanctuary."})
             except:
                 pass
        
        # Default
        if not badges:
            badges.append({"name": "Gym Rat", "desc": "You put in the work, day in and day out."})
        
        return {
            "year": int(target_year),
            "total_workouts": int(total_workouts),
            "total_volume_kg": float(total_volume),
            "total_reps": int(total_reps),
            "total_sets": int(total_sets),
            "top_exercises": top_exercises,
            "heaviest_lift": heaviest_lift,
            "most_active_month": most_active_month_num,
            "favorite_category": fav_category,
            "muscle_split": muscle_split, 
            "weekly_activity": weekly_activity, 
            "longest_streak": int(longest_streak),
            "year_grid": year_grid,
            "the_grinder": the_grinder,
            "badges": badges
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def read_root():
    return {"status": "ok"}
