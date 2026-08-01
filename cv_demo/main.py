# main.py
import cv2
import math
from config import *
from hand_tracker import HandTracker
from components import DraggableComponent
from circuit import CircuitRenderer

def main():
    # Initialize Camera (Use DirectShow on Windows to prevent MSMF capture failure)
    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    if not cap.isOpened():
        cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
    
    # Initialize Modules
    tracker = HandTracker()
    renderer = CircuitRenderer()
    
    # Instantiate Components
    components = [
        DraggableComponent(300, 600, 220, 40, "Copper Rod", True, COPPER_COLOR),
        DraggableComponent(900, 600, 220, 40, "Rubber Rod", False, WOOD_COLOR)
    ]
    
    active_comp = None
    
    while cap.isOpened():
        success, frame = cap.read()
        if not success: 
            break
        
        # Mirror the frame to create an intuitive AR mirror effect
        frame = cv2.flip(frame, 1)
        
        # Apply semi-transparent dark overlay so the schematic pops
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (WIDTH, HEIGHT), BG_DARKEN, -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
        
        # Process Hand Tracking
        is_pinching, cursor_pos, frame = tracker.process(frame)
        
        # --- Drag and Drop Logic ---
        if is_pinching and cursor_pos:
            if active_comp is None:
                # Attempt to grab a component
                for comp in components:
                    if comp.contains(cursor_pos):
                        active_comp = comp
                        comp.is_dragged = True
                        comp.is_snapped = False
                        break
            
            if active_comp:
                # Update position to follow hand
                active_comp.x, active_comp.y = cursor_pos
        else:
            if active_comp:
                # Drop triggered
                active_comp.is_dragged = False
                dist_to_gap = math.hypot(active_comp.x - GAP_CENTER[0], active_comp.y - GAP_CENTER[1])
                
                if dist_to_gap < SNAP_DIST:
                    # Eject any currently snapped component back to its start position
                    for c in components:
                        if c.is_snapped and c != active_comp:
                            c.is_snapped = False
                            c.x, c.y = c.start_x, c.start_y
                    
                    # Snap the new component into the gap
                    active_comp.x, active_comp.y = GAP_CENTER
                    active_comp.is_snapped = True
                else:
                    # If dropped far from gap, snap back to starting inventory location
                    active_comp.x, active_comp.y = active_comp.start_x, active_comp.start_y
                
                active_comp = None

        # --- Evaluate Circuit State ---
        snapped_comp = next((c for c in components if c.is_snapped), None)
        circuit_state = "open"
        status_text = "Circuit Open - Insert Component"
        status_color = (255, 255, 255)
        
        if snapped_comp:
            if snapped_comp.is_conductor:
                circuit_state = "closed"
                status_text = "Circuit Closed - Current Flowing"
                status_color = (0, 255, 0)
            else:
                circuit_state = "blocked"
                status_text = "Circuit Open - Insulator Blocks Current"
                status_color = (0, 165, 255) # Orange
        
        # --- Render Graphics ---
        renderer.draw(frame, circuit_state)
        for comp in components:
            comp.draw(frame)
        
        # --- Draw UI Text ---
        cv2.putText(frame, status_text, (WIDTH//2 - 250, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 3)
        cv2.putText(frame, "Pinch index and thumb to drag items. Press ESC to quit.", 
                    (WIDTH//2 - 250, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
        
        cv2.imshow("AR Circuit Simulator", frame)
        
        # Exit on ESC key
        if cv2.waitKey(1) & 0xFF == 27:
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()