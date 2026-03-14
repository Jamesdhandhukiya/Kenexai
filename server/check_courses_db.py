from data import sb_admin

res = sb_admin.table("silver_course_progress").select("category").execute()
cats = set([r.get("category") for r in res.data if r.get("category")])
print("ALL CATEGORIES:", cats)
