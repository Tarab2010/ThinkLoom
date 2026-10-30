ThinkLoom 

ThinkLoom is a brainstorming app which allows a group of people to collaborate and discuss about their ideas and viewpoints through voice and video call and can submit their pre prepared plans during their meeting all under the authority of a single Leader. The discussuions are fully supervised and authorized by the Leader who holds the authority to present the ideas submitted by other, take specific parts of their ideas and maerge them to make a final result.The canvas of each meeting is stored and can be utilized during the meeting or the meeting can even start from where an earlier meeting has ended.

The workflow is designed as: Project→ Meeting → Lobby → Canvas and ideas with voice and video call → final result. 

How to use ThinkLoom

1. Create/Join a Project 
Sign up or Log in to the app
Create a project with name, description and category of project(generally Research, Project, Hackathon and Other) and you become this project's leader
Now share the invite link of this project to the members.
The team members can paste the invite link as url if they are not signed up then after signing up they are directly moved to the project page or else they can paste the invite link on the Join form present on the Dashboard. 
New members join the project as viewers the leader can change their role to editors and viceversa.

2. Create a meeting
The leader sets a title,topic and start date and time and duration for the meeting and can optionally choose to continue from an earlier meeting to use the canvas of the earlier meeting.
Meetings can be upcoming,live and ended based on their time or a meeting can end if the leader ends the meeting before its duration.The upcoming and live meetings are shown under the current tab while the ended metings are preent in the earlier tab
Even the earlier meetings links  are available to join where the members can join by clicking on the ended meeting name and can see the finals canvas of those meetings.
The Leader can even set the role of members for the meeting before the metting begins.

3. Join the meeting 
The members joining the meeting are put in a lobby where they view the offline blank canvas until the leader admits them if the leader has the voice and video call open then after admittance the members also join that call and can talk with each other.
The leader has the authority to change the role of a member during the meeting and can also  kickout a member out of the meeting but the member can re enter the lobby and request to re join the meeting but the leader can see a message as (member'name was removed earlier)
If a member wishes to see the canvas of a meeting after the meeting has ended they can join the ended meeting and see the canvas that was made in that meetinh in a view only interface.
Members cannot join the voice and video calls if the leader is not in the call. 
Leader can turn off the mic and video of members and can remove members from the call.

4. Work on canvas
Leader and editors can write paste images, texts and even draw on excallidraw canvas.
Viewers can only view the content on canvas.Leader can copy older meetings canvas on their current canvas to refresh the ideas and continue from where they left off earlier.  

5. Ideas submission and voting
evry member can submit their pre prepared ideas in pdf,docx and image format in this meeting using the right button and can even view other ideas that are submitted.
The leader can present these ideas to the members and can even copy useful content from each submitted idea.
Members can vote the ideas after seeing them and decide the best idea out of all the ideas submitted.
Members can aso see the submitted ideas in either the submission time order or the number of votes order.

6. Final result
The leader can take parts of the provided ideas,use earlier meeting canvas and editors and leader can add these ideas and add other ideas during meeting on canvas thus combining all the ideas and reaching a final result which they can download in format of png and svg.


Features 

Real time shared canvas — Members can view, edit(only editors and leader) the canvas with text,images,notes and doddle and everyone can see name of the person who is editing the canvas at that time through cursors. 

Projects creation and invitecode- create project and invite members using the invitecode. 

Meetings time-meeting can be et for later days and time as upcoming.

Waiting in lobby-members first wait in lobby before the leader admit them into the meeting.

Idea submission-members can submit their pre prepared ides on docx,pdf and image format in meeting.

Voting for ideas-members are allowed to vote the idea submitted by others anonymously.

Removal from meeting-If a member has been removed from the meeting by leader and then they are again denied 2 times when they try to re join then they are not eligible to join that meeting.

Video and voice call-members can connect to each other through voice and video call to tell their ideas and discuss by talking.

Leader's authority- Leader can admin and remove people from meetings, they can change their roles from viewer to editor nd vice versa also the submitted ideas are presented by the leader on the screen so members can get the preview of the idea. Video and voice calls can only take place when leader has joined the call and leader can turn off mic and video of members and even remove them from call.

Idea crop on canvas- Leader can crop certain parts from the submitted ideas on canvas.

Canvas history-the earlier meetings canvas are preserved in cloud storage so people can view them even after the meeting has ended.

Utilization of previous canvas-leader can use the earlier meetings canvas during the current meeting by copying their content on the canvas.

Start from where we left- while creating a meeting the leader can deside to start from an earlier meeting thus the meetings begins with the earlier meetings canvas instead of a new blank canvas.

Export the canvas- the finished canvas can be downloaded as png and svg file by the leader and editor and can be shared on other platforms by them.


Tech Stack 

React,Typescript — frontend UI and component structure. 

Vite — frontend development server and build tool. 

Tailwind CSS,lucide react — styling, designing and icons  

Excalidraw — canvas. 

LiveKit-voice and video call

MongoDB atlas-storage and database of users,meetings and projects

React Router — client-side navigation. 

Node.js and Express — backend API and room management. 

Excalidraw export-exporting the canvas file

JWT,bcrypt,httpOnly cookie — authentication

Socket.IO — real-time room events, board synchronization, and cursor updates. 

Cloudinary,multer —  cloud storage of pdf,docx and images

Pdf.js,docx-preview,html-to-image — for preview of the submitted ideas


Project Structure

ThinkLoom/

├── backend/
│   ├── config/                   # Database connection
│   │                    
│   ├── lib/                      #Helper function for file storage,file types and meeting status   
│   ├── middleware/               #Authentication and role functions 
│   ├── models/                   #MongoDB Schemas
│   ├── routes/                   # express routes
│   ├── sockets/                  #real time connection socketio functions for server side
│   ├── uploads/                  # Local uploaded files (git-ignored, runtime only)
│   ├── .env                      # Secrets (never committed)
│   └── server.js                 # main server file,Express and Socket.IO entry point

├── frontend/
│   ├── public/                        # static files, favicon and logo(default vite)
│   ├── src/
│   │   ├── assets/                    # Images and icons
│   │   ├── Components/                # Canvas, call pannel,meeting section,meeting card 
│   │   ├── lib/                       # Api sockets and canvas file helpers
│   │   ├── pages/                     # Dashboard,auth page,project page,meeting page
│   │   ├── store/                     # Zustand stores for project and authentication details
│   │   ├── App.tsx                    # Routes
│   │   ├── App.css
│   │   ├── index.css                  # Tailwind and global styles
│   │   └── main.tsx                   
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── eslint.config.js
│   └── package.json
├── .gitignore
└── README.md

Folder contents may evolve as the project develops.

How to Run Locally 

1. Clone or download the repository 

git clone https://github.com/Tarab2010/ThinkLoom.git 

cd ThinkLoom

2. Config backend

cd backend 

npm install 

create backend/.env like the backend/.env.example as:
PORT=5000
CLIENT_URL=
MONGO_URI=
JWT_SECRET=a-long-random-string
CLOUD_NAME=
CLOUD_API=
NODE_ENV=
CLOUD_SECRET=
LIVE_URL=
LIVE_API=
LIVE_SECRET=

3. Start the backend 

npm run dev 

The backend server runs on http://localhost:5000. 

4. Configure the frontend 

Open a second terminal  

cd frontend 

npm install 

In development, Vite proxies /api and /socket.io to the backend on port 5000, so no extra variable is needed. For a deployed build, create frontend/.env with:

VITE_API_URL=
VITE_SOCKET_URL=

Start the frontend

npm run dev

Open http://localhost:5173

You will see the signup page create your account and use the app use the app in two tabs one normal andother incognito tab to create project and meetings and join using both the tabs.


AI Usage 

AI assistance was used during development as a support tool for implementation, debugging, and understanding parts of the codebase. In particular, AI was used to help with: 

Socket.IO connections - understanding client/server connection setup, joining rooms, event handling, broadcasting updates, and synchronizing shared canvas,lobby and meeting-list state . 

LiveKIt voice and video calls-understanding the call flow, the backend token endpoint and testing calls locally with the LiveKit dev server.

Debugging and integration - investigating errors, reviewing component and backend interactions, and resolving issues found while integrating canvas features with real-time lobby behavior.

Canvas and UI features - multi-page PDF export of the canvas, the invite-link join flow and lucide-react icons names for different things and LiveKit components for ui were found using Ai

File handling - upload limits, file type checking, authenticated file serving, and moving file storage from local disk to Cloudinary and live preview of files during the meeting setup.

Project setup and deployment - clarifying environment configuration, how the frontend API and backend server communicate, git cleanup, and hosting on Render and Vercel.

AI suggestions were reviewed and adapted during implementation by local testing. 

Author
Shashwat Jaiswal
 