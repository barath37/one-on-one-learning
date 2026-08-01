# components.py
import cv2
from config import *

class DraggableComponent:
    def __init__(self, x, y, width, height, name, is_conductor, color):
        self.start_x = x
        self.start_y = y
        self.x = x
        self.y = y
        self.w = width
        self.h = height
        self.name = name
        self.is_conductor = is_conductor
        self.color = color
        self.is_dragged = False
        self.is_snapped = False

    def draw(self, frame):
        top_left = (int(self.x - self.w/2), int(self.y - self.h/2))
        bottom_right = (int(self.x + self.w/2), int(self.y + self.h/2))
        
        # Draw highlight border if actively dragged
        if self.is_dragged:
            cv2.rectangle(frame, (top_left[0]-6, top_left[1]-6), 
                          (bottom_right[0]+6, bottom_right[1]+6), HIGHLIGHT_COLOR, 3)
        
        # Draw rod body
        cv2.rectangle(frame, top_left, bottom_right, self.color, -1)
        cv2.rectangle(frame, top_left, bottom_right, (0, 0, 0), 2) # Outline
        
        # Draw label
        text_size = cv2.getTextSize(self.name, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
        text_x = int(self.x - text_size[0]/2)
        text_y = int(self.y + text_size[1]/2)
        cv2.putText(frame, self.name, (text_x, text_y), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, TEXT_COLOR, 2)

    def contains(self, pos):
        if not pos: 
            return False
        px, py = pos
        return (self.x - self.w/2 <= px <= self.x + self.w/2) and \
               (self.y - self.h/2 <= py <= self.y + self.h/2)