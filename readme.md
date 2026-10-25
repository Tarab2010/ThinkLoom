ThinkLoom 

ThinkLoom is a collaborative brainstorming app for group of people to present their ideas and discuss with each other under the supervision of a leader.Theleader can create projects invite others to the projects and can create meetings where the members and leaders have a shared canvas on which the leader and editors can make changes while the viewers can only view the canvas. Every member is allowed to submit thier ideas for the meeting and people can vote these ideas to show their support. The leader can present these ideas to the members and even crop the best parts from various ideas on canvas to make a better solution even the earlier meetings canvas can be used in the present meeting.

The workflow is designed as: Project→ Meeting → Lobby → Canvas and ideas → final result. 

How to use ThinkLoom

1. Create/Join a Project 
Sign up or Log in to the app
Create a project with name, description and category of project(generally research, project, hackathon and other) and you become this project's leader.Now share the invite link of this project to the members.
The team members can paste the invite link asurl if they are not signed up then after signing up they are directly moved to the project page or else they can paste the invite link on the Join form present on the Dashboard. New members join the project as viewers the leader can change thier role to editores and viceversa.

2. Create a meeting
The leader sets a title,topic and start date and time and duration for the meeting and can optionally choose to continue from an earlier meeting to use the canvas of the earlier meeting.
Meetings can be upcoming,live and ended based on their time or a meeting can end if the leader ends the meeting before its duration.
Even the earlier meetings links  are available where the members can see the finals cnvas of those meetings.
The Leader can even set the role of members for the meeting before the metting begins.
3. Join the meeting 
The members join the meeting are are put in a lobby where they view the offline blank canvas until the leader admits them if the leader has the voice and video call open then after admittance the memers also join that call and can talk with each other.
The leader has the authority to kickout a member out of the meeting
Once everyone has contributed ideas, organize them into meaningful groups. 

Identify notes that discuss similar topics. 

Group related notes into clusters. 

Give each cluster a descriptive name. 

Use connectors to show relationships between ideas. 

When zoomed out, clusters appear as summary bubbles, making larger boards easier to navigate. 

4. Converge (Vote on ideas) 

In this phase, participants vote on ideas and clusters they consider most valuable. 

Review the notes and clusters on the board. 

Use your available vote dots to support important ideas. 

Distribute your votes according to your priorities. 

Observe the voting indicators to see which ideas receive the most support. 

Ideas with stronger voting support receive greater visual emphasis, helping the team identify popular suggestions and shared priorities. 

5. Results 

After the Converge phase begins, open the Results page to review the outcome of the brainstorming session. 

Review the ranked ideas and clusters. 

Identify the suggestions that received the most votes. 

Use the export option to download the results as a Markdown (.md) file. 

The exported file can be saved, shared with teammates or used in meeting notes, project, documentation and future planning. 

Features 

Shared brainstorming canvas — create, edit, move, and style notes on a zoomable canvas. 

Real-time collaboration — room participants can see board updates and other participants' cursors through Socket.IO. 

Room links and participant names — create a room and invite others to join it. 

Session question — give the brainstorm a central question to guide the discussion. 

Silent brainstorming — authors can be hidden during Diverge so ideas can be considered on their own. 

Clusters — group related notes and name the themes. 

Connectors — draw connections between related notes, including curved arrows. 

Phases — organize the session into Diverge, Cluster, and Converge stages. 

Dot-budget voting — participants use a limited number of votes to highlight important notes and clusters. 

Results and Markdown export — review vote results and export the brainstorm as Markdown. 

Canvas navigation — pan and zoom, fit the board to the viewport, and use the minimap. 

Room persistence — room state can be saved as JSON files by the backend. 

Tech Stack 

React — frontend UI and component structure. 

Vite — frontend development server and build tool. 

Tailwind CSS v4 — styling and design tokens. 

Konva / React-Konva — canvas rendering and interactive canvas objects. 

React Router — client-side navigation. 

Axios — HTTP requests to the backend API. 

Node.js and Express — backend API and room management. 

Socket.IO — real-time room events, board synchronization, and cursor updates. 

JSON file persistence — local room state storage during development. 

npm — dependency management. 

Project Structure 

Constellate/ 

├── Backend/ 

│   ├── src/ 

│   │   ├── config/       # Environment configuration 

│   │   ├── controllers/  # HTTP route controllers 

│   │   ├── lib/          # Room logic and persistence 

│   │   ├── routes/       # Express routes 

│   │   └── sockets/      # Socket.IO event handlers 

│   ├── data/             # Local persisted room files (created at runtime) 

│   ├── server.js 

│   └── .env.example 

├── Frontend/ 

│   ├── src/ 

│   │   ├── app/           # Router and app setup 

│   │   ├── features/      # Feature-specific API and hooks 

│   │   ├── components/    # Shared UI and canvas components 

│   │   ├── lib/           # API, socket, and identity helpers 

│   │   └── styles/        # Global styles and design tokens 

│   └── .env.example 

└── README.md 

Folder contents may evolve as the project develops. 

How to Run Locally 

1. Clone or download the repository 

git clone https://github.com/Naynsi2012/Constellate.git 

cd Constellate 

If you downloaded the source as a ZIP, extract it and open a terminal in the extracted project folder. 

2. Configure the backend environment 

cd Backend 

npm install 

cp .env.example .env 

On Windows Command Prompt, use copy .env.example .env instead of cp. 

Open Backend/.env and update the values if needed: 

# Required 

FRONTEND_URL=http://localhost:5173 

PORT=3000 

NODE_ENV=development 

 

# Optional 

DATA_DIR=./data/rooms 

ROOM_TTL=3d 

ROOM_CLEANUP_INTERVAL=1h 

3. Start the backend 

Run this from the Backend directory: 

npm run dev 

The backend will use the configured port, normally http://localhost:3000. 

4. Configure the frontend environment 

Open a second terminal from the project root: 

cd Frontend 

npm install 

cp .env.example .env 

On Windows Command Prompt, use copy .env.example .env. Congratulations! We were very impressed with your application and are pleased to invite you to the next stage of the interview process for the [Job Title] position at [Company Name]. 

We would like to invite you for an online interview next Sunday, [Date], between 11:00 AM and 11:00 PM. 

To help us schedule your session efficiently, please fill out the Google Form linked below with your details and indicate your preferred time slot within the given window: 

🔗 [Insert Google Form Link Here] 

Please note that your preferred slot is subject to availability, and we will do our best to accommodate your choice. 

Once your slot is confirmed, you will receive a follow-up confirmation email containing the meeting link along with important guidelines and instructions for the interview. 

If you have any urgent questions or face issues with the form, please feel free to reply directly to this email. 

We look forward to meeting with you! 

Best regards, 

[Your Name] 

HR Manager 

[Company Name] 

[Contact Information / Website] 

 

The frontend .env should contain the backend API URL: 

VITE_API_URL=http://localhost:3000 

5. Start the frontend 

Run this from the Frontend directory: 

npm run dev 

Vite will print the local URL. It is usually: 

http://localhost:5173 

Keep both the backend and frontend terminals running while developing. 

AI Usage 

AI assistance was used during development as a support tool for implementation, debugging, and understanding parts of the codebase. In particular, AI was used to help with: 

Curved connector and arrow bending — working through the geometry for curved arrows, control points, arrowheads, and how connector bends are rendered on the canvas. 

Socket.IO connections — understanding client/server connection setup, joining rooms, event handling, broadcasting updates, and synchronizing shared room state. 

Debugging and integration — investigating errors, reviewing component and backend interactions, and resolving issues found while integrating canvas features with real-time room behavior. 

Project setup — clarifying environment configuration and how the frontend API and backend server communicate. 

AI suggestions were reviewed and adapted during implementation. The project’s final behavior should be validated through local testing, particularly for multi-user synchronization and phase permissions. 

 
Congratulations! We were very impressed with your application and are pleased to invite you to the next stage of the interview process for the Full Stack Developer Intern position at The Humble Foundry Private Limited. 

We would like to invite you for an online interview on 25th October,2026 between 11:00 AM and 11:00 PM. 

To help us schedule your session efficiently please reply with your preferred time slot before 9:00 a.m. of 25th October, 2026. 

Please fill out the Google Form linked below with your details: 

🔗  

Please note that your preferred slot is subject to availability, and we will do our best to accommodate your choice. 

Once your slot is confirmed, you will receive a follow-up confirmation email containing the meeting link along with important guidelines and instructions for the interview. 

If you have any urgent questions or face issues with the form, please feel free to reply directly to this email. 

We look forward to meeting with you! 

Best regards, 

Krishna Chauhan 

Operations Intern 

The Humble Foundry Private Limited 

krishnachauhan@thehumblefoundry.com 

 