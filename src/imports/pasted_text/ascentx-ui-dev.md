Continue developing the existing AscentX interface shown in the current project.

IMPORTANT:
Do NOT redesign or replace the existing interface.
Preserve the current dark, professional, engineering/technical visual language, existing sidebar, 3D viewport, right-side statistics panel, processing console, typography, spacing and color system.

AscentX is an AI-enabled Single-Pass Drone Video to Accurate 3D Model Generation System.

The UI should feel like a professional geospatial / photogrammetry / engineering software, NOT a generic SaaS dashboard.

==================================================
1. PROJECT WORKSPACE
==================================================

Extend the existing "Project" section.

Add:
- Project name
- Project ID
- Project status
- Creation date
- Last processed time
- Input video information
- GPS availability
- IMU/RTK availability
- Camera calibration status
- Reconstruction status

Show a compact project summary card:

INPUT
Single-pass drone video
GPS / Flight Metadata
Camera Parameters

PROCESSING
Frame Selection
AI Depth
SfM/MVS
Georeferencing

OUTPUT
3D Model
Point Cloud
Measurements

Allow:
- New Project
- Open Project
- Rename Project
- Duplicate Project
- Delete Project
- Project Settings

==================================================
2. INPUT DATA MODULE
==================================================

Improve the existing Input Data section.

Create a professional upload workspace containing:

A. Drone Video
- Drag and drop video area
- MP4 / MOV support
- Resolution detection
- Duration
- Frame rate
- File size
- Preview thumbnail

B. Flight Metadata
- GPS status
- Latitude / Longitude
- Altitude
- Flight speed
- Timestamp
- IMU availability
- RTK/PPK availability

C. Camera Information
- Camera model
- Resolution
- Focal length
- Principal point
- Distortion coefficients
- Calibration status

Show validation badges:
✓ Valid
⚠ Missing
✕ Invalid

Provide:
"Validate Input" button.

The system should clearly tell the user if required information is missing before reconstruction.

==================================================
3. INTELLIGENT FRAME SELECTION
==================================================

Create a dedicated Frame Selection workspace.

Show:

Total Frames
Selected Frames
Rejected Frames
Selection Rate

Provide visual timeline of the complete drone video.

Each frame should have:
- Frame number
- Timestamp
- Sharpness score
- Brightness
- Contrast
- Novelty score
- Final reconstruction score
- Selection status

Selection categories:
- SELECTED_KEY
- SELECTED_SUPPORT
- SELECTED_COVERAGE
- REJECTED

Add filters:
- Sharpness
- Novelty
- Redundancy
- Coverage
- Final score

Add buttons:
"Run Frame Analysis"
"Preview Selected Frames"
"Accept Selection"
"Recalculate"

Visually highlight selected frames on the timeline.

==================================================
4. AI RECONSTRUCTION PIPELINE
==================================================

Create a reconstruction control panel.

Show the pipeline as:

Frame Processing
      ↓
Camera Calibration
      ↓
SfM
      ↓
AI Depth Estimation
      ↓
MVS
      ↓
Dense Point Cloud
      ↓
Mesh Generation
      ↓
Texture Generation
      ↓
Georeferencing

For each stage show:
- Status
- Progress
- Processing time
- GPU utilization
- Output generated

Statuses:
QUEUED
RUNNING
COMPLETED
WARNING
FAILED

Provide:
"Start Reconstruction"
"Pause"
"Resume"
"Cancel"

==================================================
5. AI DEPTH MODULE
==================================================

Create an AI Depth Analysis panel.

Show:
- Selected frame
- RGB image
- Depth visualization
- Depth confidence
- Estimated depth range

Display:
Depth Model
GPU
Inference Time
Confidence

Use a clean split-view:
RGB | Depth

Do NOT make it overly complex.

==================================================
6. DYNAMIC OBJECT FILTERING
==================================================

Add a Dynamic Object Detection module.

Detect common moving objects:
- Cars
- Motorcycles
- People
- Animals

Show:
Original frame
Detected objects
Filtered reconstruction view

Provide:
"Enable Dynamic Object Filtering"

Show:
Objects detected
Objects removed
Affected frames

The purpose should be clearly understandable:
"Reduce reconstruction artifacts caused by moving objects."

==================================================
7. RECONSTRUCTION QUALITY / CONFIDENCE
==================================================

Add a "Confidence" mode to the existing 3D viewport.

Create a confidence heatmap overlay.

Use:
High Confidence
Medium Confidence
Low Confidence
Insufficient Coverage

Allow user to toggle:

MODEL
POINT CLOUD
CONFIDENCE
CAMERA POSITIONS
COVERAGE

When the user clicks a region of the model, show:

Confidence Score
Frame Coverage
Number of Observations
Reprojection Quality

This should become one of AscentX's signature UI features.

==================================================
8. 3D VIEWER
==================================================

Upgrade the current central viewport while preserving its existing appearance.

Add viewport controls:

ORBIT
PAN
ZOOM
FIT
TOP
FRONT
SIDE
RESET

Display modes:

TEXTURED
SOLID
WIREFRAME
POINT CLOUD
CONFIDENCE

Add toggles:

Grid
Axes
Camera Positions
Flight Path
Bounding Box
Measurements

Allow:
- Rotate
- Zoom
- Pan
- Select object
- Hide/show layers

Keep the viewport clean and engineering-focused.

==================================================
9. MEASUREMENT TOOLS
==================================================

Add an engineering measurement toolbar.

Tools:

Distance
Area
Height
Volume
Polyline
Coordinate

When the user selects two points on the 3D model:

Distance:
12.42 m

For area:
Area:
324.6 m²

For volume:
Volume:
1,284.3 m³

Show measurement labels directly inside the viewport.

Add:
"Save Measurement"

Store measurements inside the project.

==================================================
10. GEOREFERENCING
==================================================

Create a Georeferencing panel.

Display:

Coordinate System
Latitude
Longitude
Altitude
Scale
North Direction
GPS Accuracy
RTK Status

Show a small map alongside the model.

Display:
Drone Flight Path
Model Location
Reference Point

Allow:
- Set Coordinate System
- Adjust Origin
- Apply GPS Alignment
- Apply RTK/PPK
- Recalculate Scale

Make this understandable to a non-expert user.

==================================================
11. MESH ANALYSIS
==================================================

Expand the existing right-side Mesh Statistics panel.

Show:

Vertices
Faces
Components
Manifold Status
Degenerate Faces
Average Edge Length
Bounding Box
Surface Area
Model Dimensions

Also show:

Geometry Quality
Coverage
Reconstruction Confidence

Use compact statistic cards.

==================================================
12. PROCESSING CONSOLE
==================================================

Preserve the existing bottom Processing Console.

Improve it with:

Live progress
Current stage
GPU utilization
VRAM usage
Elapsed time
Estimated remaining time

Example:

FRAME SELECTION       ✓ COMPLETE
CAMERA CALIBRATION    ✓ COMPLETE
FEATURE EXTRACTION    ✓ COMPLETE
SfM RECONSTRUCTION    ● RUNNING 72%
AI DEPTH              QUEUED
DENSE MVS              QUEUED

Use technical log messages below.

==================================================
13. OUTPUT & EXPORT
==================================================

Create a professional Export workspace.

Available outputs:

3D Model
- OBJ
- PLY
- GLB

Point Cloud
- PLY
- LAS

Geospatial
- GeoJSON
- KML

Terrain
- DSM
- DTM

Reports
- Reconstruction Report
- Quality Report
- Measurement Report

Allow:
- Select output format
- Select coordinate system
- Include textures
- Include metadata
- Export

Show export progress.

==================================================
14. REPORTS
==================================================

Create a Reports section.

Generate a concise project report containing:

Input Summary
Frame Selection Statistics
Camera Calibration
Reconstruction Statistics
Point Cloud Statistics
Mesh Statistics
Geospatial Accuracy
Confidence Summary
Processing Time

Include visual charts only where useful.

==================================================
15. DASHBOARD
==================================================

Create a lightweight AscentX dashboard.

Show:

Recent Projects
Processing Jobs
Completed Models
Storage Usage

Main CTA:

"Create New Mission"

Secondary actions:
Open Project
Import Data
View Models

Use a professional engineering-software layout, not a marketing dashboard.

==================================================
16. USER WORKFLOW
==================================================

The complete user journey should be:

CREATE PROJECT
      ↓
UPLOAD DRONE VIDEO
      ↓
ADD GPS / FLIGHT DATA
      ↓
VALIDATE INPUT
      ↓
ANALYZE FRAMES
      ↓
SELECT BEST FRAMES
      ↓
START RECONSTRUCTION
      ↓
AI + SfM/MVS PROCESSING
      ↓
GEOREFERENCE
      ↓
QUALITY / CONFIDENCE CHECK
      ↓
3D VIEWER
      ↓
MEASURE / ANALYZE
      ↓
EXPORT

The user should never need to understand complicated photogrammetry configuration unless they open "Advanced Settings".

==================================================
17. ADVANCED SETTINGS
==================================================

Provide an optional Advanced Settings panel.

Include:

Frame sampling
Sharpness threshold
Similarity threshold
Feature extraction settings
Matching strategy
Depth model
GPU selection
Reconstruction quality
Mesh density
Texture resolution
Coordinate system

Default values should be automatically configured.

Use:
"Recommended"
"Advanced"

so beginners can use the system easily.

==================================================
18. DESIGN SYSTEM
==================================================

Preserve the existing AscentX visual identity.

Style:
- Dark engineering workstation
- Near-black background
- Subtle blue/cyan/purple accents
- Thin borders
- Compact panels
- Technical typography
- Minimal rounded corners
- Subtle glow only where useful
- Dense but organized information

Avoid:
- Excessive gradients
- Huge cards
- Excessive rounded UI
- Marketing-style illustrations
- Generic SaaS dashboard aesthetics
- Unnecessary animations

Use real engineering/3D software conventions.

==================================================
19. RESPONSIVE BEHAVIOR
==================================================

Desktop-first interface.

Primary target:
1440p / 1920x1080 workstation.

Sidebar can collapse.

Right analysis panel can collapse.

Bottom console can expand/collapse.

3D viewport should always remain the visual focus.

==================================================
20. FINAL PRODUCT STRUCTURE
==================================================

Main navigation:

PROJECT
INPUT DATA
FRAME SELECTION
RECONSTRUCTION
MESH ANALYSIS
GEOREFERENCING
VISUALIZATION
MEASUREMENTS
REPORTS
EXPORT

Top bar:

Project Name
Processing Status
GPU Status
Save
Export

Center:
Interactive 3D viewport

Right:
Contextual analysis / statistics

Bottom:
Processing console

The final interface should communicate one simple idea:

"SINGLE DRONE PASS → INTELLIGENT PROCESSING → ACCURATE GEOREFERENCED 3D MODEL"

Build all screens as a connected product experience using the existing AscentX design system.
Do not create disconnected mockup pages.
All buttons, tabs, panels and navigation should visually behave as parts of the same application.