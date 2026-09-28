# AI Mock Interview & Placement Readiness Platform 🚀

An AI-powered platform that helps students prepare for interviews, understand their strengths and weaknesses, and improve their placement readiness.

Built as an extension of my ElevanceSkills internship training project.

---

**✨ What this project does**

This platform combines AI interviews, placement analysis, company-based interview simulation, competitive challenges, authentication, and role-based access into one application.

**🎯 Main Features**

🧠 **Adaptive Interview Engine**

- AI evaluates every answer
- Difficulty changes based on performance
- Generates follow-up questions
- Maintains interview context
- Prevents duplicate questions
- Handles skipped and repeated answers
- Generates a final performance report

📊 **AI Placement Readiness**

- Overall placement readiness score
- Resume analysis
- Technical skill assessment
- Communication analysis
- Strong and weak areas
- Missing industry skills
- Personalized improvement roadmap
- Historical performance tracking

🏢 **AI Recruiter Simulator**

Practice interviews based on different company profiles:

- Google
- Amazon
- Microsoft
- TCS
- Infosys

Each profile can have different interview styles, difficulty levels, evaluation criteria, and question patterns.

🏆 **Peer Challenge Arena**

- Daily and weekly challenges
- HR
- Technical
- Aptitude
- Domain-Specific
- AI Practice
- Leaderboards
- Rankings
- Streaks
- Challenge statistics

🔐Enterprise Authentication

- Email verification
- Password strength validation
- Password reset
- Account lockout
- Active session management
- Login history
- Device information
- Security alerts
- Password policies

👥 Role-Based Access Control

`Student` → Interviews, reports and challenges

`Mentor` → Student performance and feedback

`Admin` → Platform management and administration

🛠️ Tech Stack**

Frontend  
`Next.js` `React` `TypeScript` `Tailwind CSS`

Backend  
`Node.js` `Express.js` `REST APIs`

Database  
`MongoDB` `Mongoose`

AI  
`Groq API`

Authentication  
`JWT` `bcrypt` `RBAC`

Tools & Deployment  
`Git` `GitHub` `Render` `Vercel / Netlify`

🧩 How it works**

text
              👤 Candidate
                   │
                   ▼
          ┌─────────────────┐
          │  Next.js Client │
          └────────┬────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ Express Backend │
          └───────┬─────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      MongoDB   Groq AI   Auth/RBAC
        │         │         │
        └─────────┼─────────┘
                  ▼
       Personalized Results
