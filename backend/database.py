from pymongo import MongoClient
from config import MONGO_URI

try:
    # Create the MongoDB client
    client = MongoClient(MONGO_URI)
    
    # Select the database
    db = client.saarthi_db
    
    # Send a ping to confirm a successful connection
    client.admin.command('ping')
    print("✅ Successfully connected to MongoDB Atlas!")

except Exception as e:
    print("❌ Could not connect to MongoDB:", e)

# Export the users collection
users_collection = db["users"]

# Counter for auto-incrementing IDs
def get_next_sequence(name: str) -> int:
    """Get the next sequence number for auto-incrementing IDs."""
    counter = db["counters"].find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return counter["seq"]