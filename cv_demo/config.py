# config.py

# Display Settings
WIDTH = 1280
HEIGHT = 720
FPS_TARGET = 30

# Colors (BGR Format)
BG_DARKEN = (20, 20, 20)
WIRE_COLOR = (200, 200, 200)
COPPER_COLOR = (50, 110, 210)  
WOOD_COLOR = (50, 75, 110)     
GLOW_COLOR = (0, 255, 255)     
TEXT_COLOR = (255, 255, 255)
HIGHLIGHT_COLOR = (0, 255, 0)  
SPARK_COLOR = (0, 0, 255)      

# Electron Settings
ELECTRON_COLOR = (255, 200, 0) 
ELECTRON_SPEED = 12            
ELECTRON_SPACING = 80          

# Circuit Layout
GAP_CENTER = (600, 250)
GAP_WIDTH = 200

# --- NEW: Hysteresis Pinch Parameters ---
PINCH_START_THRESHOLD = 0.05  # Strict distance required to GRAB
PINCH_STOP_THRESHOLD = 0.10   # Loose distance required to DROP (prevents accidental drops)
SNAP_DIST = 100         

# Smoothing
SMOOTHING_FACTOR = 0.25