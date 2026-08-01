# hand_tracker.py
import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import math
import urllib.request
import os
from config import *

class HandTracker:
    def __init__(self):
        self.model_path = 'hand_landmarker.task'
        self._ensure_model_exists()
        
        base_options = python.BaseOptions(model_asset_path=self.model_path)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            num_hands=1,
            min_hand_detection_confidence=0.7,
            min_hand_presence_confidence=0.7,
            min_tracking_confidence=0.7,
            running_mode=vision.RunningMode.IMAGE
        )
        self.detector = vision.HandLandmarker.create_from_options(options)
        
        # Cursor and state memory
        self.cursor_x = None
        self.cursor_y = None
        self.is_pinching = False  # NEW: Remembers pinch state between frames
        
        self.HAND_CONNECTIONS = [
            (0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 7), (7, 8), 
            (5, 9), (9, 10), (10, 11), (11, 12), (9, 13), (13, 14), (14, 15), 
            (15, 16), (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)
        ]

    def _ensure_model_exists(self):
        if not os.path.exists(self.model_path):
            print("Downloading Hand Landmarker model (~10MB)...")
            url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            urllib.request.urlretrieve(url, self.model_path)
            print("Download complete.")

    def process(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        detection_result = self.detector.detect(mp_image)
        
        cursor_pos = None

        if detection_result.hand_landmarks:
            hand_landmarks = detection_result.hand_landmarks[0]
            h, w, _ = frame.shape
            
            # Draw Skeleton
            for connection in self.HAND_CONNECTIONS:
                p1 = hand_landmarks[connection[0]]
                p2 = hand_landmarks[connection[1]]
                cv2.line(frame, (int(p1.x * w), int(p1.y * h)), 
                         (int(p2.x * w), int(p2.y * h)), (0, 255, 0), 2)
            
            index_tip = hand_landmarks[8]
            thumb_tip = hand_landmarks[4]
            
            dist = math.hypot(index_tip.x - thumb_tip.x, index_tip.y - thumb_tip.y)
            
            # --- NEW: Hysteresis Pinch Logic ---
            if self.is_pinching:
                # If we are already pinching, wait until fingers open wide to drop
                if dist > PINCH_STOP_THRESHOLD:
                    self.is_pinching = False
            else:
                # If we aren't pinching, wait until fingers get very close to grab
                if dist < PINCH_START_THRESHOLD:
                    self.is_pinching = True
            
            # Raw midpoint coordinates
            raw_x = (index_tip.x + thumb_tip.x) / 2 * w
            raw_y = (index_tip.y + thumb_tip.y) / 2 * h
            
            # Exponential Moving Average (EMA) Smoothing
            if self.cursor_x is None:
                self.cursor_x = raw_x
                self.cursor_y = raw_y
            else:
                self.cursor_x += SMOOTHING_FACTOR * (raw_x - self.cursor_x)
                self.cursor_y += SMOOTHING_FACTOR * (raw_y - self.cursor_y)
            
            cursor_pos = (int(self.cursor_x), int(self.cursor_y))
            
            # Draw cursor
            cursor_color = HIGHLIGHT_COLOR if self.is_pinching else (0, 0, 255)
            cv2.circle(frame, cursor_pos, 8, cursor_color, -1)
            if self.is_pinching:
                cv2.circle(frame, cursor_pos, 15, cursor_color, 2)
        else:
            self.cursor_x = None
            self.cursor_y = None
            self.is_pinching = False  # Reset if hand leaves screen

        return self.is_pinching, cursor_pos, frame