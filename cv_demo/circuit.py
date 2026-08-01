# circuit.py
import cv2
import numpy as np
from config import *

class CircuitRenderer:
    def __init__(self):
        self.glow_intensity = 0.0
        self.electron_offset = 0.0  # Tracks the animation position
        
    def draw(self, frame, state):
        target_glow = 1.0 if state == "closed" else 0.0
        self.glow_intensity += (target_glow - self.glow_intensity) * 0.1
        
        # 1. Draw Wires
        cv2.line(frame, (200, 250), (200, 450), WIRE_COLOR, 4)       # Left line
        cv2.line(frame, (200, 450), (1000, 450), WIRE_COLOR, 4)      # Bottom line
        cv2.line(frame, (1000, 450), (1000, 250), WIRE_COLOR, 4)     # Right line
        cv2.line(frame, (200, 250), (500, 250), WIRE_COLOR, 4)       # Top Left
        cv2.line(frame, (700, 250), (1000, 250), WIRE_COLOR, 4)      # Top Right
        
        # 2. --- NEW: Draw Flowing Electrons ---
        if state == "closed":
            # Move the electrons forward
            self.electron_offset += ELECTRON_SPEED
            
            # The total perimeter of the circuit wire is 2000 pixels.
            # We loop through this distance and place an electron every 'ELECTRON_SPACING' pixels
            for i in range(0, 2000, ELECTRON_SPACING):
                # Calculate absolute distance mapped around the loop
                d = (self.electron_offset + i) % 2000
                
                # Map the 1D distance 'd' onto 2D wire coordinates:
                if d < 200:
                    ex, ey = 200, 450 - d                  # Up the left wire
                elif d < 1000:
                    ex, ey = 200 + (d - 200), 250          # Across the top wire (through gap)
                elif d < 1200:
                    ex, ey = 1000, 250 + (d - 1000)        # Down the right wire
                else:
                    ex, ey = 1000 - (d - 1200), 450        # Across the bottom wire (back to start)
                
                # Draw the electron (small bright cyan dot)
                cv2.circle(frame, (int(ex), int(ey)), 5, ELECTRON_COLOR, -1)
                
        # 3. Draw Battery Symbol (drawn over wires/electrons)
        cv2.line(frame, (170, 330), (230, 330), (0, 0, 0), 4)        
        cv2.line(frame, (185, 370), (215, 370), (0, 0, 0), 8)        
        cv2.putText(frame, "9V", (140, 355), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        
        # 4. Draw Gap/Socket Receptacles
        cv2.circle(frame, (500, 250), 10, WIRE_COLOR, -1)
        cv2.circle(frame, (700, 250), 10, WIRE_COLOR, -1)
        
        # 5. --- Bulb Rendering ---
        bulb_center = (1000, 350)
        if self.glow_intensity > 0.01:
            overlay = np.zeros_like(frame)
            glow_radius = int(60 + self.glow_intensity * 40)
            cv2.circle(overlay, bulb_center, glow_radius, GLOW_COLOR, -1)
            overlay = cv2.GaussianBlur(overlay, (99, 99), 0)
            
            alpha = self.glow_intensity * 0.8
            cv2.addWeighted(overlay, alpha, frame, 1.0, 0, frame)
        
        cv2.circle(frame, bulb_center, 40, (200, 200, 200), 2)       
        cv2.line(frame, (980, 370), (990, 340), (100, 100, 100), 2)  
        cv2.line(frame, (990, 340), (1010, 340), (100, 100, 100), 2) 
        cv2.line(frame, (1010, 340), (1020, 370), (100, 100, 100), 2) 

        # 6. Draw "Blocked" visual if insulator is present
        if state == "blocked":
            cv2.line(frame, (GAP_CENTER[0]-15, GAP_CENTER[1]-30), 
                            (GAP_CENTER[0]+15, GAP_CENTER[1]-60), SPARK_COLOR, 3)
            cv2.line(frame, (GAP_CENTER[0]+15, GAP_CENTER[1]-30), 
                            (GAP_CENTER[0]-15, GAP_CENTER[1]-60), SPARK_COLOR, 3)