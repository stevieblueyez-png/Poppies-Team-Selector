from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Standard football positions
STANDARD_POSITIONS = [
    "GK", "CB", "RB", "LB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"
]

# Formation definitions with positions needed
FORMATIONS = {
    "4-4-2": {
        "name": "4-4-2",
        "positions": ["GK", "RB", "CB", "CB", "LB", "RM", "CM", "CM", "LM", "ST", "ST"],
        "layout": [
            {"position": "GK", "x": 50, "y": 90},
            {"position": "RB", "x": 85, "y": 70},
            {"position": "CB", "x": 65, "y": 75},
            {"position": "CB", "x": 35, "y": 75},
            {"position": "LB", "x": 15, "y": 70},
            {"position": "RM", "x": 85, "y": 45},
            {"position": "CM", "x": 60, "y": 50},
            {"position": "CM", "x": 40, "y": 50},
            {"position": "LM", "x": 15, "y": 45},
            {"position": "ST", "x": 60, "y": 20},
            {"position": "ST", "x": 40, "y": 20}
        ]
    },
    "4-3-3": {
        "name": "4-3-3",
        "positions": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "RW", "ST", "LW"],
        "layout": [
            {"position": "GK", "x": 50, "y": 90},
            {"position": "RB", "x": 85, "y": 70},
            {"position": "CB", "x": 65, "y": 75},
            {"position": "CB", "x": 35, "y": 75},
            {"position": "LB", "x": 15, "y": 70},
            {"position": "CM", "x": 70, "y": 50},
            {"position": "CM", "x": 50, "y": 45},
            {"position": "CM", "x": 30, "y": 50},
            {"position": "RW", "x": 85, "y": 25},
            {"position": "ST", "x": 50, "y": 15},
            {"position": "LW", "x": 15, "y": 25}
        ]
    },
    "3-5-2": {
        "name": "3-5-2",
        "positions": ["GK", "CB", "CB", "CB", "RM", "CM", "CDM", "CM", "LM", "ST", "ST"],
        "layout": [
            {"position": "GK", "x": 50, "y": 90},
            {"position": "CB", "x": 70, "y": 75},
            {"position": "CB", "x": 50, "y": 78},
            {"position": "CB", "x": 30, "y": 75},
            {"position": "RM", "x": 90, "y": 50},
            {"position": "CM", "x": 65, "y": 45},
            {"position": "CDM", "x": 50, "y": 55},
            {"position": "CM", "x": 35, "y": 45},
            {"position": "LM", "x": 10, "y": 50},
            {"position": "ST", "x": 60, "y": 18},
            {"position": "ST", "x": 40, "y": 18}
        ]
    },
    "4-2-3-1": {
        "name": "4-2-3-1",
        "positions": ["GK", "RB", "CB", "CB", "LB", "CDM", "CDM", "RM", "CAM", "LM", "ST"],
        "layout": [
            {"position": "GK", "x": 50, "y": 90},
            {"position": "RB", "x": 85, "y": 70},
            {"position": "CB", "x": 65, "y": 75},
            {"position": "CB", "x": 35, "y": 75},
            {"position": "LB", "x": 15, "y": 70},
            {"position": "CDM", "x": 60, "y": 55},
            {"position": "CDM", "x": 40, "y": 55},
            {"position": "RM", "x": 85, "y": 35},
            {"position": "CAM", "x": 50, "y": 35},
            {"position": "LM", "x": 15, "y": 35},
            {"position": "ST", "x": 50, "y": 15}
        ]
    },
    "5-3-2": {
        "name": "5-3-2",
        "positions": ["GK", "RB", "CB", "CB", "CB", "LB", "CM", "CM", "CM", "ST", "ST"],
        "layout": [
            {"position": "GK", "x": 50, "y": 90},
            {"position": "RB", "x": 90, "y": 65},
            {"position": "CB", "x": 70, "y": 75},
            {"position": "CB", "x": 50, "y": 78},
            {"position": "CB", "x": 30, "y": 75},
            {"position": "LB", "x": 10, "y": 65},
            {"position": "CM", "x": 70, "y": 45},
            {"position": "CM", "x": 50, "y": 48},
            {"position": "CM", "x": 30, "y": 45},
            {"position": "ST", "x": 60, "y": 18},
            {"position": "ST", "x": 40, "y": 18}
        ]
    },
    "4-1-4-1": {
        "name": "4-1-4-1",
        "positions": ["GK", "RB", "CB", "CB", "LB", "CDM", "RM", "CM", "CM", "LM", "ST"],
        "layout": [
            {"position": "GK", "x": 50, "y": 90},
            {"position": "RB", "x": 85, "y": 70},
            {"position": "CB", "x": 65, "y": 75},
            {"position": "CB", "x": 35, "y": 75},
            {"position": "LB", "x": 15, "y": 70},
            {"position": "CDM", "x": 50, "y": 58},
            {"position": "RM", "x": 85, "y": 40},
            {"position": "CM", "x": 60, "y": 42},
            {"position": "CM", "x": 40, "y": 42},
            {"position": "LM", "x": 15, "y": 40},
            {"position": "ST", "x": 50, "y": 15}
        ]
    },
    "3-4-3": {
        "name": "3-4-3",
        "positions": ["GK", "CB", "CB", "CB", "RM", "CM", "CM", "LM", "RW", "ST", "LW"],
        "layout": [
            {"position": "GK", "x": 50, "y": 90},
            {"position": "CB", "x": 70, "y": 75},
            {"position": "CB", "x": 50, "y": 78},
            {"position": "CB", "x": 30, "y": 75},
            {"position": "RM", "x": 85, "y": 50},
            {"position": "CM", "x": 60, "y": 50},
            {"position": "CM", "x": 40, "y": 50},
            {"position": "LM", "x": 15, "y": 50},
            {"position": "RW", "x": 85, "y": 22},
            {"position": "ST", "x": 50, "y": 15},
            {"position": "LW", "x": 15, "y": 22}
        ]
    }
}

# Position compatibility mapping (which positions can fill other positions)
POSITION_COMPATIBILITY = {
    "GK": ["GK"],
    "CB": ["CB"],
    "RB": ["RB", "RM", "CB"],
    "LB": ["LB", "LM", "CB"],
    "CDM": ["CDM", "CM", "CB"],
    "CM": ["CM", "CDM", "CAM"],
    "CAM": ["CAM", "CM", "CF"],
    "RM": ["RM", "RW", "RB", "CM"],
    "LM": ["LM", "LW", "LB", "CM"],
    "RW": ["RW", "RM", "ST", "CF"],
    "LW": ["LW", "LM", "ST", "CF"],
    "CF": ["CF", "ST", "CAM"],
    "ST": ["ST", "CF", "RW", "LW"]
}

# Pydantic Models
class PositionRating(BaseModel):
    position: str
    rating: int = Field(ge=1, le=5)

class PlayerCreate(BaseModel):
    name: str
    positions: List[PositionRating] = []
    preferred_foot: str = "right"  # "left" or "right"

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    positions: Optional[List[PositionRating]] = None
    is_available: Optional[bool] = None
    preferred_foot: Optional[str] = None

class Player(BaseModel):
    id: str
    name: str
    positions: List[PositionRating] = []
    preferred_foot: str = "right"
    is_available: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AvailabilityUpdate(BaseModel):
    player_ids: List[str]
    is_available: bool

class LineupRequest(BaseModel):
    formation: str
    mode: str = "strength"  # "strength" or "balanced"

class LineupSlot(BaseModel):
    position: str
    player_id: Optional[str] = None
    player_name: Optional[str] = None
    rating: int = 0
    x: float
    y: float

class HeatmapZone(BaseModel):
    zone: str
    avg_rating: float
    x: float
    y: float
    width: float
    height: float

class LineupResponse(BaseModel):
    formation: str
    mode: str
    lineup: List[LineupSlot]
    bench: List[dict]
    heatmap: List[HeatmapZone]
    total_rating: float
    available_count: int

# Helper functions
def player_helper(player) -> dict:
    return {
        "id": str(player["_id"]),
        "name": player["name"],
        "positions": player.get("positions", []),
        "preferred_foot": player.get("preferred_foot", "right"),
        "is_available": player.get("is_available", False),
        "created_at": player.get("created_at", datetime.utcnow()),
        "updated_at": player.get("updated_at", datetime.utcnow())
    }

def get_player_rating_for_position(player_data: dict, target_position: str) -> int:
    """Get a player's rating for a specific position, considering compatibility."""
    positions = player_data.get("positions", [])
    
    # Direct match
    for pos in positions:
        if pos["position"] == target_position:
            return pos["rating"]
    
    # Check compatible positions with penalty
    compatible = POSITION_COMPATIBILITY.get(target_position, [target_position])
    best_rating = 0
    for pos in positions:
        if pos["position"] in compatible:
            # Apply penalty for playing out of natural position
            penalty = 0 if pos["position"] == target_position else 1
            rating = max(1, pos["rating"] - penalty)
            best_rating = max(best_rating, rating)
    
    return best_rating

def generate_lineup(available_players: List[dict], formation: str, mode: str) -> dict:
    """Generate the best starting 11 based on formation and mode."""
    formation_data = FORMATIONS.get(formation)
    if not formation_data:
        return None
    
    positions_needed = formation_data["positions"]
    layout = formation_data["layout"]
    
    lineup = []
    used_players = set()
    
    if mode == "strength":
        # For each position, find the best available player
        for idx, pos in enumerate(positions_needed):
            best_player = None
            best_rating = 0
            
            for player in available_players:
                if player["id"] in used_players:
                    continue
                rating = get_player_rating_for_position(player, pos)
                if rating > best_rating:
                    best_rating = rating
                    best_player = player
            
            if best_player:
                used_players.add(best_player["id"])
                lineup.append({
                    "position": pos,
                    "player_id": best_player["id"],
                    "player_name": best_player["name"],
                    "rating": best_rating,
                    "x": layout[idx]["x"],
                    "y": layout[idx]["y"]
                })
            else:
                lineup.append({
                    "position": pos,
                    "player_id": None,
                    "player_name": None,
                    "rating": 0,
                    "x": layout[idx]["x"],
                    "y": layout[idx]["y"]
                })
    else:
        # Balanced mode: ensure coverage first, then optimize
        # Group positions by zone
        zones = {
            "defense": ["GK", "CB", "RB", "LB"],
            "midfield": ["CDM", "CM", "CAM", "RM", "LM"],
            "attack": ["RW", "LW", "CF", "ST"]
        }
        
        # Calculate zone needs
        zone_positions = {"defense": [], "midfield": [], "attack": []}
        for idx, pos in enumerate(positions_needed):
            for zone, zone_pos_list in zones.items():
                if pos in zone_pos_list:
                    zone_positions[zone].append((idx, pos))
                    break
        
        # First pass: assign players to ensure each zone has coverage
        for zone in ["defense", "midfield", "attack"]:
            positions_in_zone = zone_positions[zone]
            
            # Get players who can play in this zone
            zone_players = []
            for player in available_players:
                if player["id"] in used_players:
                    continue
                max_rating = 0
                best_pos = None
                for idx, pos in positions_in_zone:
                    rating = get_player_rating_for_position(player, pos)
                    if rating > max_rating:
                        max_rating = rating
                        best_pos = (idx, pos)
                if max_rating > 0:
                    zone_players.append((player, max_rating, best_pos))
            
            # Sort by rating and assign
            zone_players.sort(key=lambda x: x[1], reverse=True)
            
            for idx, pos in positions_in_zone:
                best_player = None
                best_rating = 0
                best_idx = -1
                
                for i, (player, _, preferred) in enumerate(zone_players):
                    if player["id"] in used_players:
                        continue
                    rating = get_player_rating_for_position(player, pos)
                    if rating > best_rating:
                        best_rating = rating
                        best_player = player
                        best_idx = i
                
                if best_player:
                    used_players.add(best_player["id"])
                    lineup.append({
                        "position": pos,
                        "player_id": best_player["id"],
                        "player_name": best_player["name"],
                        "rating": best_rating,
                        "x": layout[idx]["x"],
                        "y": layout[idx]["y"]
                    })
                else:
                    lineup.append({
                        "position": pos,
                        "player_id": None,
                        "player_name": None,
                        "rating": 0,
                        "x": layout[idx]["x"],
                        "y": layout[idx]["y"]
                    })
        
        # Sort lineup by original position order
        lineup.sort(key=lambda x: (x["y"], x["x"]), reverse=True)
    
    # Get bench players
    bench = []
    for player in available_players:
        if player["id"] not in used_players:
            bench.append({
                "id": player["id"],
                "name": player["name"],
                "positions": player.get("positions", [])
            })
    
    # Calculate heatmap
    heatmap = calculate_heatmap(lineup)
    
    # Calculate total rating
    total_rating = sum(slot["rating"] for slot in lineup) / len(lineup) if lineup else 0
    
    return {
        "formation": formation,
        "mode": mode,
        "lineup": lineup,
        "bench": bench,
        "heatmap": heatmap,
        "total_rating": round(total_rating, 2),
        "available_count": len(available_players)
    }

def calculate_heatmap(lineup: List[dict]) -> List[dict]:
    """Calculate heatmap zones based on player positions and ratings."""
    zones = [
        {"zone": "GK", "x": 35, "y": 85, "width": 30, "height": 15, "positions": ["GK"]},
        {"zone": "Left Defense", "x": 0, "y": 60, "width": 33, "height": 25, "positions": ["LB", "CB"]},
        {"zone": "Central Defense", "x": 33, "y": 60, "width": 34, "height": 25, "positions": ["CB"]},
        {"zone": "Right Defense", "x": 67, "y": 60, "width": 33, "height": 25, "positions": ["RB", "CB"]},
        {"zone": "Left Midfield", "x": 0, "y": 35, "width": 33, "height": 25, "positions": ["LM", "CM", "CDM"]},
        {"zone": "Central Midfield", "x": 33, "y": 35, "width": 34, "height": 25, "positions": ["CM", "CDM", "CAM"]},
        {"zone": "Right Midfield", "x": 67, "y": 35, "width": 33, "height": 25, "positions": ["RM", "CM", "CDM"]},
        {"zone": "Left Attack", "x": 0, "y": 10, "width": 33, "height": 25, "positions": ["LW", "LM", "ST"]},
        {"zone": "Central Attack", "x": 33, "y": 10, "width": 34, "height": 25, "positions": ["ST", "CF", "CAM"]},
        {"zone": "Right Attack", "x": 67, "y": 10, "width": 33, "height": 25, "positions": ["RW", "RM", "ST"]}
    ]
    
    heatmap = []
    for zone in zones:
        ratings = []
        for slot in lineup:
            # Check if player is in this zone based on position
            slot_x = slot["x"]
            slot_y = slot["y"]
            if (zone["x"] <= slot_x <= zone["x"] + zone["width"] and
                zone["y"] <= slot_y <= zone["y"] + zone["height"]):
                ratings.append(slot["rating"])
        
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        heatmap.append({
            "zone": zone["zone"],
            "avg_rating": round(avg_rating, 2),
            "x": zone["x"],
            "y": zone["y"],
            "width": zone["width"],
            "height": zone["height"]
        })
    
    return heatmap

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Football Team Manager API"}

@api_router.get("/positions")
async def get_positions():
    """Get all standard football positions."""
    return {"positions": STANDARD_POSITIONS}

@api_router.get("/formations")
async def get_formations():
    """Get all available formations."""
    return {"formations": list(FORMATIONS.keys())}

@api_router.get("/formations/{formation}")
async def get_formation_details(formation: str):
    """Get details of a specific formation."""
    if formation not in FORMATIONS:
        raise HTTPException(status_code=404, detail="Formation not found")
    return FORMATIONS[formation]

# Player CRUD
@api_router.post("/players", response_model=Player)
async def create_player(player: PlayerCreate):
    """Create a new player."""
    player_dict = {
        "name": player.name,
        "positions": [p.dict() for p in player.positions],
        "preferred_foot": player.preferred_foot,
        "is_available": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.players.insert_one(player_dict)
    player_dict["_id"] = result.inserted_id
    return player_helper(player_dict)

@api_router.get("/players", response_model=List[Player])
async def get_players():
    """Get all players."""
    players = await db.players.find().to_list(100)
    return [player_helper(player) for player in players]

@api_router.get("/players/{player_id}", response_model=Player)
async def get_player(player_id: str):
    """Get a specific player."""
    try:
        player = await db.players.find_one({"_id": ObjectId(player_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid player ID")
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player_helper(player)

@api_router.put("/players/{player_id}", response_model=Player)
async def update_player(player_id: str, player_update: PlayerUpdate):
    """Update a player."""
    try:
        existing = await db.players.find_one({"_id": ObjectId(player_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid player ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Player not found")
    
    update_data = {"updated_at": datetime.utcnow()}
    if player_update.name is not None:
        update_data["name"] = player_update.name
    if player_update.positions is not None:
        update_data["positions"] = [p.dict() for p in player_update.positions]
    if player_update.is_available is not None:
        update_data["is_available"] = player_update.is_available
    if player_update.preferred_foot is not None:
        update_data["preferred_foot"] = player_update.preferred_foot
    
    await db.players.update_one(
        {"_id": ObjectId(player_id)},
        {"$set": update_data}
    )
    
    updated = await db.players.find_one({"_id": ObjectId(player_id)})
    return player_helper(updated)

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str):
    """Delete a player."""
    try:
        result = await db.players.delete_one({"_id": ObjectId(player_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid player ID")
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return {"message": "Player deleted successfully"}

# Availability
@api_router.post("/availability")
async def update_availability(update: AvailabilityUpdate):
    """Update availability for multiple players."""
    for player_id in update.player_ids:
        try:
            await db.players.update_one(
                {"_id": ObjectId(player_id)},
                {"$set": {"is_available": update.is_available, "updated_at": datetime.utcnow()}}
            )
        except:
            continue
    
    return {"message": "Availability updated"}

@api_router.put("/players/{player_id}/availability")
async def toggle_player_availability(player_id: str, is_available: bool):
    """Toggle a single player's availability."""
    try:
        result = await db.players.update_one(
            {"_id": ObjectId(player_id)},
            {"$set": {"is_available": is_available, "updated_at": datetime.utcnow()}}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid player ID")
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return {"message": "Availability updated", "is_available": is_available}

# Lineup Generation
@api_router.post("/lineup", response_model=LineupResponse)
async def generate_starting_lineup(request: LineupRequest):
    """Generate the best starting 11 based on available players."""
    if request.formation not in FORMATIONS:
        raise HTTPException(status_code=400, detail="Invalid formation")
    
    if request.mode not in ["strength", "balanced"]:
        raise HTTPException(status_code=400, detail="Mode must be 'strength' or 'balanced'")
    
    # Get available players
    available_players = await db.players.find({"is_available": True}).to_list(100)
    available_players = [player_helper(p) for p in available_players]
    
    if len(available_players) < 11:
        # Still generate lineup with available players
        pass
    
    result = generate_lineup(available_players, request.formation, request.mode)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to generate lineup")
    
    return result

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
