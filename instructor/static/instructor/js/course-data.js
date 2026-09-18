/* =========================================================================
   TechBridge · course-data.js
   -------------------------------------------------------------------------
   AUTHORING MODEL
   -------------------------------------------------------------------------
   A course author only ever has to write the *lightweight* lesson record
   (this is exactly the shape you gave in the brief):

     {
       id: 17,
       title: "Model Evaluation Lab",
       description: "Learn how to evaluate machine learning models.",
       instructor: "Femi Alabi",
       duration: "45 mins",
       video: "videos/ai/model-evaluation.mp4",
       notes: "notes/model-evaluation.pdf",
       slides: "slides/model-evaluation.pdf",
       quiz: 60,          // <- just a NUMBER of questions to autogenerate
       assignment: 2,     // <- just an assignment "kind" to autogenerate
       completed: false
     }

   Everything a lesson page actually needs to render itself — the quiz
   question objects, the assignment brief/copy, and the live completion
   flag — is generated at load time by hydrateLesson(). Nothing else in
   the app needs to be hand-authored.

   QUIZ SIZING
   -------------------------------------------------------------------------
   Each course's per-lesson `quiz:` counts are set so the lessons in that
   course add up to 60 total quiz questions (e.g. a 5-lesson course carries
   12 questions per lesson, a 6-lesson course carries 10, a 4-lesson course
   carries 15).

   ENROLLMENT MODEL
   -------------------------------------------------------------------------
   The catalog above (RAW_COURSES) lists every course TechBridge offers.
   A given student is not "in" all of them — only the ones they signed up
   for (their track at signup) or later added from the dashboard. That
   subset lives in its own localStorage key (ENROLL_KEY) and everything
   student-facing (dashboard cards, stats, deadlines, achievements) is
   scoped to it via getEnrolledCourseIds()/getCourse()/getOverallStats().
   A freshly-enrolled course always starts at 0 completed lessons — real
   progress only accrues as the learner actually completes lessons.
   ========================================================================= */

(function (global) {
  "use strict";

  const PROGRESS_KEY = "techbridge_progress";
  const CERT_KEY = "techbridge_certificates";
  const ASSIGN_KEY = "techbridge_assignments";
  const QUIZ_RESULTS_KEY = "techbridge_quiz_results";
  const ENROLL_KEY = "techbridge_enrollments";
  const ACTIVITY_KEY = "techbridge_activity_days";
  const HOURS_LOG_KEY = "techbridge_hours_log";
  const USERS_KEY = "techbridge_users";
  const CURRENT_USER_KEY = "techbridge_current_user";

  /* ----------------------------------------------------------------------
     0. PER-USER NAMESPACING
     ---------------------------------------------------------------------- */
  // Every store below (progress, certificates, enrollments, activity,
  // hours) used to live under one bare global key, shared by the whole
  // browser. That meant every student on the same device was reading and
  // writing the exact same record — logging out and signing up as someone
  // new just showed you the previous student's courses and progress,
  // because it *was* the previous student's data.
  //
  // Every store key is now namespaced as "base::email". `email` defaults
  // to whoever is currently signed in, but every public function below
  // also takes an optional trailing `email` argument so callers that need
  // to look at a *different* student's data (e.g. the instructor
  // dashboard listing several students) can do so without touching who's
  // actually logged in.
  function getCurrentUserEmail() {
    try {
      const user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
      return (user && user.email) ? String(user.email).trim().toLowerCase() : null;
    } catch (e) {
      return null;
    }
  }
  function scopedKey(base, email) {
    const scope = (email ? String(email).trim().toLowerCase() : getCurrentUserEmail()) || "guest";
    return base + "::" + scope;
  }

  // Registry of every account ever created on this device. signup.html
  // and login.html write to this so the instructor dashboard (and
  // anything else) can enumerate real students instead of only ever
  // knowing about whichever one is currently signed in.
  function getAllUsers() {
    try {
      const list = JSON.parse(localStorage.getItem(USERS_KEY));
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  function registerUser(user) {
    if (!user || !user.email) return;
    const email = String(user.email).trim().toLowerCase();
    const list = getAllUsers().filter(u => String(u.email).trim().toLowerCase() !== email);
    list.push(user);
    try { localStorage.setItem(USERS_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }

  /* ----------------------------------------------------------------------
     1. RAW COURSE CATALOG (lightweight, author-facing)
     ---------------------------------------------------------------------- */
  const RAW_COURSES = {
    ai: {
      id: "ai",
      category: "01 · AI",
      title: "Applied Machine Learning",
      instructor: "Femi Alabi",
      lessons: [
        { id: 13, title: "Foundations of Applied ML", description: "Get oriented with the ML workflow, from raw data to a working model.", instructor: "Femi Alabi", duration: "25 mins", video: "videos/ai/foundations.mp4", notes: "notes/ai/foundations.pdf", slides: "slides/ai/foundations.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 14, title: "Data Wrangling & Cleaning", description: "Practice cleaning messy datasets so they're ready for modeling.", instructor: "Femi Alabi", duration: "35 mins", video: "videos/ai/data-wrangling.mp4", notes: "notes/ai/data-wrangling.pdf", slides: "slides/ai/data-wrangling.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 15, title: "Supervised Learning Basics", description: "Understand classification vs regression and train your first model.", instructor: "Femi Alabi", duration: "40 mins", video: "videos/ai/supervised-learning.mp4", notes: "notes/ai/supervised-learning.pdf", slides: "slides/ai/supervised-learning.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 16, title: "Feature Engineering", description: "Learn techniques for turning raw fields into signals a model can use.", instructor: "Femi Alabi", duration: "35 mins", video: "videos/ai/feature-engineering.mp4", notes: "notes/ai/feature-engineering.pdf", slides: "slides/ai/feature-engineering.pdf", quiz: 60, assignment: 2, completed: true },
        { id: 17, title: "Model Evaluation Lab", description: "Learn how to evaluate machine learning models.", instructor: "Femi Alabi", duration: "45 mins", video: "videos/ai/model-evaluation.mp4", notes: "notes/ai/model-evaluation.pdf", slides: "slides/ai/model-evaluation.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 18, title: "Deploying Your First Model", description: "Ship a trained model behind a simple API and monitor it in production.", instructor: "Femi Alabi", duration: "40 mins", video: "videos/ai/deploying.mp4", notes: "notes/ai/deploying.pdf", slides: "slides/ai/deploying.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    robotics: {
      id: "robotics",
      category: "02 · Robotics",
      title: "Robotics Fundamentals",
      instructor: "Chidera Nwosu",
      lessons: [
        { id: 21, title: "Intro to Robotics Platforms", description: "Tour the hardware and tools you'll use throughout this course.", instructor: "Chidera Nwosu", duration: "20 mins", video: "videos/robotics/intro.mp4", notes: "notes/robotics/intro.pdf", slides: "slides/robotics/intro.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 22, title: "Circuits & Power Basics", description: "Wire up power safely and understand the circuits driving your robot.", instructor: "Chidera Nwosu", duration: "30 mins", video: "videos/robotics/circuits.mp4", notes: "notes/robotics/circuits.pdf", slides: "slides/robotics/circuits.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 23, title: "Servo Control Assignment", description: "Program precise servo movement and submit your control script.", instructor: "Chidera Nwosu", duration: "35 mins", video: "videos/robotics/servo-control.mp4", notes: "notes/robotics/servo-control.pdf", slides: "slides/robotics/servo-control.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 24, title: "Sensors & Feedback Loops", description: "Close the loop with sensor input to make your robot self-correcting.", instructor: "Chidera Nwosu", duration: "40 mins", video: "videos/robotics/sensors.mp4", notes: "notes/robotics/sensors.pdf", slides: "slides/robotics/sensors.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 25, title: "Autonomous Navigation", description: "Combine motion and sensing to navigate a simple course autonomously.", instructor: "Chidera Nwosu", duration: "45 mins", video: "videos/robotics/navigation.mp4", notes: "notes/robotics/navigation.pdf", slides: "slides/robotics/navigation.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    cyber: {
      id: "cyber",
      category: "03 · Cybersecurity",
      title: "Cybersecurity Essentials",
      instructor: "Wale Bello",
      lessons: [
        { id: 31, title: "Security Mindsets", description: "Think like an attacker and a defender at the same time.", instructor: "Wale Bello", duration: "25 mins", video: "videos/cyber/mindsets.mp4", notes: "notes/cyber/mindsets.pdf", slides: "slides/cyber/mindsets.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 32, title: "Network Fundamentals", description: "Understand how traffic moves so you can spot where it's exploited.", instructor: "Wale Bello", duration: "35 mins", video: "videos/cyber/network-fundamentals.mp4", notes: "notes/cyber/network-fundamentals.pdf", slides: "slides/cyber/network-fundamentals.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 33, title: "Common Attack Vectors", description: "Walk through phishing, malware, and social engineering case studies.", instructor: "Wale Bello", duration: "40 mins", video: "videos/cyber/attack-vectors.mp4", notes: "notes/cyber/attack-vectors.pdf", slides: "slides/cyber/attack-vectors.pdf", quiz: 60, assignment: 2, completed: true },
        { id: 34, title: "Defense in Depth", description: "Layer defenses so a single failure doesn't compromise the system.", instructor: "Wale Bello", duration: "35 mins", video: "videos/cyber/defense-in-depth.mp4", notes: "notes/cyber/defense-in-depth.pdf", slides: "slides/cyber/defense-in-depth.pdf", quiz: 60, assignment: 2, completed: true },
        { id: 35, title: "Incident Response Capstone", description: "Respond to a simulated breach from detection to resolution.", instructor: "Wale Bello", duration: "45 mins", video: "videos/cyber/incident-response.mp4", notes: "notes/cyber/incident-response.pdf", slides: "slides/cyber/incident-response.pdf", quiz: 60, assignment: 3, completed: true }
      ]
    },
    iot: {
      id: "iot",
      category: "04 · IoT",
      title: "Internet of Things Studio",
      instructor: "Ngozi Eze",
      lessons: [
        { id: 41, title: "Sensor Wiring Intro", description: "Wire up your first sensors and read live data from them.", instructor: "Ngozi Eze", duration: "25 mins", video: "videos/iot/sensor-wiring.mp4", notes: "notes/iot/sensor-wiring.pdf", slides: "slides/iot/sensor-wiring.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 42, title: "Microcontroller Basics", description: "Get comfortable flashing and debugging code on a microcontroller.", instructor: "Ngozi Eze", duration: "35 mins", video: "videos/iot/microcontrollers.mp4", notes: "notes/iot/microcontrollers.pdf", slides: "slides/iot/microcontrollers.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 43, title: "Connecting to the Cloud", description: "Stream device data to a cloud dashboard in real time.", instructor: "Ngozi Eze", duration: "40 mins", video: "videos/iot/cloud-connectivity.mp4", notes: "notes/iot/cloud-connectivity.pdf", slides: "slides/iot/cloud-connectivity.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 44, title: "Edge Automation", description: "Trigger local actions on-device without a round trip to the cloud.", instructor: "Ngozi Eze", duration: "40 mins", video: "videos/iot/edge-automation.mp4", notes: "notes/iot/edge-automation.pdf", slides: "slides/iot/edge-automation.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 45, title: "IoT Studio Capstone", description: "Build an end-to-end connected device project from scratch.", instructor: "Ngozi Eze", duration: "50 mins", video: "videos/iot/capstone.mp4", notes: "notes/iot/capstone.pdf", slides: "slides/iot/capstone.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    swdev: {
      id: "swdev",
      category: "05 · Software Dev",
      title: "Software Development Track",
      instructor: "Tunde Salako",
      lessons: [
        { id: 51, title: "Version Control Workflow", description: "Branch, commit, and review like a professional engineering team.", instructor: "Tunde Salako", duration: "25 mins", video: "videos/swdev/version-control.mp4", notes: "notes/swdev/version-control.pdf", slides: "slides/swdev/version-control.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 52, title: "Testing Fundamentals", description: "Write tests that catch regressions before your users do.", instructor: "Tunde Salako", duration: "35 mins", video: "videos/swdev/testing.mp4", notes: "notes/swdev/testing.pdf", slides: "slides/swdev/testing.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 53, title: "API Design Exercise", description: "Design a clean, versioned REST API and defend your choices in review.", instructor: "Tunde Salako", duration: "40 mins", video: "videos/swdev/api-design.mp4", notes: "notes/swdev/api-design.pdf", slides: "slides/swdev/api-design.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 54, title: "Databases & Persistence", description: "Model data and choose the right storage for the job.", instructor: "Tunde Salako", duration: "40 mins", video: "videos/swdev/databases.mp4", notes: "notes/swdev/databases.pdf", slides: "slides/swdev/databases.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 55, title: "Shipping to Production", description: "Deploy, monitor, and roll back safely.", instructor: "Tunde Salako", duration: "35 mins", video: "videos/swdev/shipping.mp4", notes: "notes/swdev/shipping.pdf", slides: "slides/swdev/shipping.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    startup: {
      id: "startup",
      category: "06 · Startup Incubation",
      title: "Startup Incubation Sprint",
      instructor: "Zainab Yusuf",
      lessons: [
        { id: 61, title: "Problem & Customer Discovery", description: "Validate a real problem before you build anything.", instructor: "Zainab Yusuf", duration: "30 mins", video: "videos/startup/discovery.mp4", notes: "notes/startup/discovery.pdf", slides: "slides/startup/discovery.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 62, title: "MVP Scoping", description: "Cut your idea down to the smallest thing worth testing.", instructor: "Zainab Yusuf", duration: "30 mins", video: "videos/startup/mvp-scoping.mp4", notes: "notes/startup/mvp-scoping.pdf", slides: "slides/startup/mvp-scoping.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 63, title: "Pitch & Fundraising Basics", description: "Structure a pitch that survives investor questions.", instructor: "Zainab Yusuf", duration: "35 mins", video: "videos/startup/pitching.mp4", notes: "notes/startup/pitching.pdf", slides: "slides/startup/pitching.pdf", quiz: 60, assignment: 2, completed: true },
        { id: 64, title: "Demo Day Capstone", description: "Present your sprint project to the incubator panel.", instructor: "Zainab Yusuf", duration: "40 mins", video: "videos/startup/demo-day.mp4", notes: "notes/startup/demo-day.pdf", slides: "slides/startup/demo-day.pdf", quiz: 60, assignment: 3, completed: true }
      ]
    },
    uiux: {
      id: "uiux",
      category: "07 · UI/UX Design",
      title: "UI/UX Design Studio",
      instructor: "Adaeze Okafor",
      lessons: [
        { id: 71, title: "Design Thinking Foundations", description: "Frame problems around real users before touching a screen.", instructor: "Adaeze Okafor", duration: "25 mins", video: "videos/uiux/design-thinking.mp4", notes: "notes/uiux/design-thinking.pdf", slides: "slides/uiux/design-thinking.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 72, title: "Wireframing & Layout", description: "Sketch low-fidelity flows that map out the core user journey.", instructor: "Adaeze Okafor", duration: "30 mins", video: "videos/uiux/wireframing.mp4", notes: "notes/uiux/wireframing.pdf", slides: "slides/uiux/wireframing.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 73, title: "Visual Design Systems", description: "Build a reusable component and color system for a product.", instructor: "Adaeze Okafor", duration: "40 mins", video: "videos/uiux/design-systems.mp4", notes: "notes/uiux/design-systems.pdf", slides: "slides/uiux/design-systems.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 74, title: "Prototyping & Interaction", description: "Turn static screens into a clickable, testable prototype.", instructor: "Adaeze Okafor", duration: "35 mins", video: "videos/uiux/prototyping.mp4", notes: "notes/uiux/prototyping.pdf", slides: "slides/uiux/prototyping.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 75, title: "Usability Testing Capstone", description: "Run a moderated usability test and turn findings into changes.", instructor: "Adaeze Okafor", duration: "45 mins", video: "videos/uiux/usability-testing.mp4", notes: "notes/uiux/usability-testing.pdf", slides: "slides/uiux/usability-testing.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    datasci: {
      id: "datasci",
      category: "08 · Data Science",
      title: "Data Science & Analytics",
      instructor: "Kelechi Umeh",
      lessons: [
        { id: 81, title: "Exploratory Data Analysis", description: "Profile a raw dataset and surface the patterns worth chasing.", instructor: "Kelechi Umeh", duration: "30 mins", video: "videos/datasci/eda.mp4", notes: "notes/datasci/eda.pdf", slides: "slides/datasci/eda.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 82, title: "Statistics for Analysts", description: "Cover the core statistical tools behind every good analysis.", instructor: "Kelechi Umeh", duration: "35 mins", video: "videos/datasci/statistics.mp4", notes: "notes/datasci/statistics.pdf", slides: "slides/datasci/statistics.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 83, title: "Data Visualization", description: "Turn a spreadsheet of numbers into a chart people actually read.", instructor: "Kelechi Umeh", duration: "35 mins", video: "videos/datasci/visualization.mp4", notes: "notes/datasci/visualization.pdf", slides: "slides/datasci/visualization.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 84, title: "SQL for Analytics", description: "Query, join, and aggregate production-scale tables with confidence.", instructor: "Kelechi Umeh", duration: "40 mins", video: "videos/datasci/sql.mp4", notes: "notes/datasci/sql.pdf", slides: "slides/datasci/sql.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 85, title: "Analytics Capstone", description: "Deliver an end-to-end analysis with a recommendation deck.", instructor: "Kelechi Umeh", duration: "45 mins", video: "videos/datasci/capstone.mp4", notes: "notes/datasci/capstone.pdf", slides: "slides/datasci/capstone.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    mobiledev: {
      id: "mobiledev",
      category: "09 · Mobile Dev",
      title: "Mobile App Development",
      instructor: "Ibrahim Suleiman",
      lessons: [
        { id: 91, title: "Mobile UI Foundations", description: "Learn the layout and navigation patterns native apps rely on.", instructor: "Ibrahim Suleiman", duration: "25 mins", video: "videos/mobiledev/ui-foundations.mp4", notes: "notes/mobiledev/ui-foundations.pdf", slides: "slides/mobiledev/ui-foundations.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 92, title: "State & Data Flow", description: "Manage state cleanly as a mobile app grows past one screen.", instructor: "Ibrahim Suleiman", duration: "35 mins", video: "videos/mobiledev/state-management.mp4", notes: "notes/mobiledev/state-management.pdf", slides: "slides/mobiledev/state-management.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 93, title: "Working with Device APIs", description: "Tap into camera, location, and storage APIs the right way.", instructor: "Ibrahim Suleiman", duration: "40 mins", video: "videos/mobiledev/device-apis.mp4", notes: "notes/mobiledev/device-apis.pdf", slides: "slides/mobiledev/device-apis.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 94, title: "Offline & Sync Patterns", description: "Keep an app usable without a connection, then reconcile later.", instructor: "Ibrahim Suleiman", duration: "40 mins", video: "videos/mobiledev/offline-sync.mp4", notes: "notes/mobiledev/offline-sync.pdf", slides: "slides/mobiledev/offline-sync.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 95, title: "App Store Launch Capstone", description: "Package, test, and submit a finished app for release.", instructor: "Ibrahim Suleiman", duration: "45 mins", video: "videos/mobiledev/launch.mp4", notes: "notes/mobiledev/launch.pdf", slides: "slides/mobiledev/launch.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    cloud: {
      id: "cloud",
      category: "10 · Cloud Computing",
      title: "Cloud Computing Essentials",
      instructor: "Grace Adeyemi",
      lessons: [
        { id: 101, title: "Cloud Fundamentals", description: "Understand compute, storage, and networking in the cloud.", instructor: "Grace Adeyemi", duration: "25 mins", video: "videos/cloud/fundamentals.mp4", notes: "notes/cloud/fundamentals.pdf", slides: "slides/cloud/fundamentals.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 102, title: "Provisioning Infrastructure", description: "Stand up your first cloud resources by hand, then as code.", instructor: "Grace Adeyemi", duration: "35 mins", video: "videos/cloud/provisioning.mp4", notes: "notes/cloud/provisioning.pdf", slides: "slides/cloud/provisioning.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 103, title: "Containers & Orchestration", description: "Package an app in a container and run it under an orchestrator.", instructor: "Grace Adeyemi", duration: "40 mins", video: "videos/cloud/containers.mp4", notes: "notes/cloud/containers.pdf", slides: "slides/cloud/containers.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 104, title: "Cloud Security Basics", description: "Lock down identity, access, and network boundaries by default.", instructor: "Grace Adeyemi", duration: "35 mins", video: "videos/cloud/security.mp4", notes: "notes/cloud/security.pdf", slides: "slides/cloud/security.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 105, title: "Scaling & Cost Capstone", description: "Design a cloud architecture that scales without runaway cost.", instructor: "Grace Adeyemi", duration: "45 mins", video: "videos/cloud/scaling-cost.mp4", notes: "notes/cloud/scaling-cost.pdf", slides: "slides/cloud/scaling-cost.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    web3: {
      id: "web3",
      category: "11 · Blockchain",
      title: "Blockchain & Web3",
      instructor: "Emeka Obi",
      lessons: [
        { id: 111, title: "Blockchain Fundamentals", description: "Understand how blocks, hashes, and consensus fit together.", instructor: "Emeka Obi", duration: "25 mins", video: "videos/web3/fundamentals.mp4", notes: "notes/web3/fundamentals.pdf", slides: "slides/web3/fundamentals.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 112, title: "Wallets & Transactions", description: "Move value on-chain and understand what a signature actually proves.", instructor: "Emeka Obi", duration: "30 mins", video: "videos/web3/wallets.mp4", notes: "notes/web3/wallets.pdf", slides: "slides/web3/wallets.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 113, title: "Smart Contract Basics", description: "Write and deploy your first smart contract to a test network.", instructor: "Emeka Obi", duration: "40 mins", video: "videos/web3/smart-contracts.mp4", notes: "notes/web3/smart-contracts.pdf", slides: "slides/web3/smart-contracts.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 114, title: "Security & Auditing", description: "Spot the exploit patterns that drain contracts most often.", instructor: "Emeka Obi", duration: "40 mins", video: "videos/web3/security.mp4", notes: "notes/web3/security.pdf", slides: "slides/web3/security.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 115, title: "dApp Capstone", description: "Ship a small decentralized app end to end.", instructor: "Emeka Obi", duration: "45 mins", video: "videos/web3/dapp-capstone.mp4", notes: "notes/web3/dapp-capstone.pdf", slides: "slides/web3/dapp-capstone.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    gamedev: {
      id: "gamedev",
      category: "12 · Game Dev",
      title: "Game Development Lab",
      instructor: "Tobi Fashola",
      lessons: [
        { id: 121, title: "Game Engine Basics", description: "Get oriented in a game engine's scenes, objects, and loop.", instructor: "Tobi Fashola", duration: "25 mins", video: "videos/gamedev/engine-basics.mp4", notes: "notes/gamedev/engine-basics.pdf", slides: "slides/gamedev/engine-basics.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 122, title: "Player Movement & Physics", description: "Wire up responsive controls and believable physics.", instructor: "Tobi Fashola", duration: "35 mins", video: "videos/gamedev/movement-physics.mp4", notes: "notes/gamedev/movement-physics.pdf", slides: "slides/gamedev/movement-physics.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 123, title: "Game Design & Mechanics", description: "Prototype a core loop that's fun before it's polished.", instructor: "Tobi Fashola", duration: "35 mins", video: "videos/gamedev/mechanics.mp4", notes: "notes/gamedev/mechanics.pdf", slides: "slides/gamedev/mechanics.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 124, title: "Audio, UI & Polish", description: "Layer in sound, menus, and juice that make a game feel finished.", instructor: "Tobi Fashola", duration: "40 mins", video: "videos/gamedev/polish.mp4", notes: "notes/gamedev/polish.pdf", slides: "slides/gamedev/polish.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 125, title: "Playtest & Ship Capstone", description: "Playtest with real users and ship a finished build.", instructor: "Tobi Fashola", duration: "45 mins", video: "videos/gamedev/playtest-ship.mp4", notes: "notes/gamedev/playtest-ship.pdf", slides: "slides/gamedev/playtest-ship.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    growth: {
      id: "growth",
      category: "13 · Digital Marketing",
      title: "Digital Marketing & Growth",
      instructor: "Funmi Adigun",
      lessons: [
        { id: 131, title: "Growth Fundamentals", description: "Map the funnel from first touch to retained user.", instructor: "Funmi Adigun", duration: "25 mins", video: "videos/growth/fundamentals.mp4", notes: "notes/growth/fundamentals.pdf", slides: "slides/growth/fundamentals.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 132, title: "Content & SEO", description: "Write and structure content that ranks and actually converts.", instructor: "Funmi Adigun", duration: "30 mins", video: "videos/growth/content-seo.mp4", notes: "notes/growth/content-seo.pdf", slides: "slides/growth/content-seo.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 133, title: "Paid Acquisition", description: "Run a small paid campaign and read the results honestly.", instructor: "Funmi Adigun", duration: "35 mins", video: "videos/growth/paid-acquisition.mp4", notes: "notes/growth/paid-acquisition.pdf", slides: "slides/growth/paid-acquisition.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 134, title: "Analytics & Experimentation", description: "Set up tracking and run an A/B test that changes a decision.", instructor: "Funmi Adigun", duration: "35 mins", video: "videos/growth/analytics-experiments.mp4", notes: "notes/growth/analytics-experiments.pdf", slides: "slides/growth/analytics-experiments.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 135, title: "Growth Campaign Capstone", description: "Plan and present a full-funnel growth campaign.", instructor: "Funmi Adigun", duration: "40 mins", video: "videos/growth/capstone.mp4", notes: "notes/growth/capstone.pdf", slides: "slides/growth/capstone.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    productmgmt: {
      id: "productmgmt",
      category: "14 · Product Mgmt",
      title: "Product Management Foundations",
      instructor: "Chioma Anyanwu",
      lessons: [
        { id: 141, title: "What Product Managers Do", description: "Understand the role and how it fits between design, eng, and business.", instructor: "Chioma Anyanwu", duration: "25 mins", video: "videos/productmgmt/role-intro.mp4", notes: "notes/productmgmt/role-intro.pdf", slides: "slides/productmgmt/role-intro.pdf", quiz: 60, assignment: 1, completed: true },
        { id: 142, title: "Discovery & Prioritization", description: "Turn a pile of feedback into a prioritized, defensible roadmap.", instructor: "Chioma Anyanwu", duration: "35 mins", video: "videos/productmgmt/discovery-prioritization.mp4", notes: "notes/productmgmt/discovery-prioritization.pdf", slides: "slides/productmgmt/discovery-prioritization.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 143, title: "Writing Specs & Requirements", description: "Write a spec an engineering team can actually build from.", instructor: "Chioma Anyanwu", duration: "30 mins", video: "videos/productmgmt/specs.mp4", notes: "notes/productmgmt/specs.pdf", slides: "slides/productmgmt/specs.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 144, title: "Metrics & Product Sense", description: "Pick the metric that actually reflects whether a feature worked.", instructor: "Chioma Anyanwu", duration: "35 mins", video: "videos/productmgmt/metrics.mp4", notes: "notes/productmgmt/metrics.pdf", slides: "slides/productmgmt/metrics.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 145, title: "Launch Plan Capstone", description: "Take a feature from spec to a real go-to-market launch plan.", instructor: "Chioma Anyanwu", duration: "40 mins", video: "videos/productmgmt/launch-capstone.mp4", notes: "notes/productmgmt/launch-capstone.pdf", slides: "slides/productmgmt/launch-capstone.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    devops: {
      id: "devops",
      category: "15 · DevOps",
      title: "DevOps & Site Reliability",
      instructor: "Segun Oladipo",
      lessons: [
        { id: 151, title: "CI/CD Fundamentals", description: "Build a pipeline that tests and ships code automatically.", instructor: "Segun Oladipo", duration: "30 mins", video: "videos/devops/cicd.mp4", notes: "notes/devops/cicd.pdf", slides: "slides/devops/cicd.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 152, title: "Infrastructure as Code", description: "Define infrastructure in version-controlled, repeatable code.", instructor: "Segun Oladipo", duration: "35 mins", video: "videos/devops/iac.mp4", notes: "notes/devops/iac.pdf", slides: "slides/devops/iac.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 153, title: "Monitoring & Alerting", description: "Instrument a service so you know it's broken before users do.", instructor: "Segun Oladipo", duration: "35 mins", video: "videos/devops/monitoring.mp4", notes: "notes/devops/monitoring.pdf", slides: "slides/devops/monitoring.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 154, title: "Incident Management", description: "Run an on-call rotation and a clean postmortem after an outage.", instructor: "Segun Oladipo", duration: "40 mins", video: "videos/devops/incident-management.mp4", notes: "notes/devops/incident-management.pdf", slides: "slides/devops/incident-management.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 155, title: "Reliability Capstone", description: "Design an SLO-backed reliability plan for a real service.", instructor: "Segun Oladipo", duration: "45 mins", video: "videos/devops/reliability-capstone.mp4", notes: "notes/devops/reliability-capstone.pdf", slides: "slides/devops/reliability-capstone.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    },
    arvr: {
      id: "arvr",
      category: "16 · AR/VR",
      title: "AR/VR & Immersive Tech",
      instructor: "Halima Bala",
      lessons: [
        { id: 161, title: "Immersive Tech Foundations", description: "Understand the hardware and platforms behind AR and VR.", instructor: "Halima Bala", duration: "25 mins", video: "videos/arvr/foundations.mp4", notes: "notes/arvr/foundations.pdf", slides: "slides/arvr/foundations.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 162, title: "3D Scenes & Spatial UI", description: "Build a 3D scene and design UI that works in real space.", instructor: "Halima Bala", duration: "35 mins", video: "videos/arvr/spatial-ui.mp4", notes: "notes/arvr/spatial-ui.pdf", slides: "slides/arvr/spatial-ui.pdf", quiz: 60, assignment: 1, completed: false },
        { id: 163, title: "Interaction & Tracking", description: "Wire up hand and head tracking to drive real interactions.", instructor: "Halima Bala", duration: "40 mins", video: "videos/arvr/interaction-tracking.mp4", notes: "notes/arvr/interaction-tracking.pdf", slides: "slides/arvr/interaction-tracking.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 164, title: "Performance & Comfort", description: "Keep frame rate high and motion comfortable for real users.", instructor: "Halima Bala", duration: "35 mins", video: "videos/arvr/performance-comfort.mp4", notes: "notes/arvr/performance-comfort.pdf", slides: "slides/arvr/performance-comfort.pdf", quiz: 60, assignment: 2, completed: false },
        { id: 165, title: "Immersive Experience Capstone", description: "Build and demo a complete AR or VR experience.", instructor: "Halima Bala", duration: "45 mins", video: "videos/arvr/capstone.mp4", notes: "notes/arvr/capstone.pdf", slides: "slides/arvr/capstone.pdf", quiz: 60, assignment: 3, completed: false }
      ]
    }
  };

  /* ----------------------------------------------------------------------
     1b. TRACK NAME → COURSE ID
     ---------------------------------------------------------------------
     signup.html collects a human-readable "track" (e.g. "AI & Machine
     Learning"). This maps that string to the matching RAW_COURSES key so
     the account created at signup can be auto-enrolled in the right
     course the first time the dashboard loads.
     ---------------------------------------------------------------------- */
  const TRACK_TO_COURSE_ID = {
    "AI & Machine Learning": "ai",
    "Robotics": "robotics",
    "Cybersecurity": "cyber",
    "Internet of Things": "iot",
    "Software Development": "swdev",
    "Startup Incubation": "startup",
    "UI/UX Design": "uiux",
    "Data Science & Analytics": "datasci",
    "Mobile App Development": "mobiledev",
    "Cloud Computing": "cloud",
    "Blockchain & Web3": "web3",
    "Game Development": "gamedev",
    "Digital Marketing & Growth": "growth",
    "Product Management": "productmgmt",
    "DevOps & Site Reliability": "devops",
    "AR/VR & Immersive Tech": "arvr"
  };
  function trackNameToCourseId(trackName) {
    return TRACK_TO_COURSE_ID[trackName] || null;
  }

  /* ----------------------------------------------------------------------
     2. AUTOGENERATION ENGINE
     ---------------------------------------------------------------------- */

  // Small deterministic PRNG so the "generated" quiz/assignment content is
  // stable across renders/reloads instead of reshuffling every time.
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return h;
  }
  function seededShuffle(arr, seed) {
    const rand = mulberry32(seed);
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---- Small helpers for pulling extra trivia out of a lesson's fields
  // (filenames, word counts, initials, etc.) so the template bank below
  // has real facts to ask about beyond title/instructor/duration.
  function fileBasename(path) {
    const file = (path || "").split("/").pop() || "";
    return file.replace(/\.[^/.]+$/, "");
  }
  function fileExtension(path) {
    const m = /\.([a-zA-Z0-9]+)$/.exec(path || "");
    return m ? m[1].toUpperCase() : "";
  }
  function folderOf(path) {
    const parts = (path || "").split("/");
    parts.pop();
    return parts.join("/") + "/";
  }
  function initialsOf(name) {
    return (name || "").split(" ").filter(Boolean).map(w => w[0].toUpperCase() + ".").join("");
  }
  function firstWord(text) {
    return ((text || "").trim().split(/\s+/)[0] || "").replace(/[",.;:]+$/, "");
  }
  function lastWord(text) {
    const words = (text || "").trim().replace(/[",.;:]+$/, "").split(/\s+/);
    return words[words.length - 1] || "";
  }
  function wordCount(text) {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  const ASSIGNMENT_KIND_LABELS = ["a reflection prompt", "an applied response task", "a hands-on practice task"];
  function assignmentKindLabel(kind) {
    return ASSIGNMENT_KIND_LABELS[(Number(kind) - 1 + ASSIGNMENT_KIND_LABELS.length * 10) % ASSIGNMENT_KIND_LABELS.length];
  }

  /* ----------------------------------------------------------------------
     QUIZ TEMPLATE BANK
     ---------------------------------------------------------------------
     ~71 independent question templates, grouped by the fact they quiz on
     (focus/description, instructor, duration, resources, true/false,
     file metadata, assignment type, quiz/lesson IDs, title & description
     wordplay). generateQuiz() below picks a distinct template per
     question — never the same template twice for one lesson — so a
     60-question quiz never repeats a question, with headroom to spare.
     ---------------------------------------------------------------------- */
  const FOCUS_TEXTS = [
    (t) => `What is the main focus of "${t}"?`,
    (t) => `Which statement best summarizes "${t}"?`,
    (t) => `In a nutshell, what does "${t}" cover?`,
    (t) => `If a classmate missed this lecture, how would you describe "${t}" to them?`,
    (t) => `Which of the following best captures the goal of "${t}"?`,
    (t) => `What is the core takeaway of the "${t}" lesson?`,
    (t) => `Which sentence most accurately reflects what "${t}" is about?`,
    (t) => `Complete this thought: "In '${t}', you will learn to ___."`
  ];
  const FOCUS_DISTRACTOR_POOLS = [
    ["Reviewing last term's grades", "Setting up unrelated social media accounts", "Memorizing the instructor's biography"],
    ["Planning an unrelated vacation itinerary", "Formatting a spreadsheet unrelated to the course", "Watching a movie trailer"],
    ["Filing last year's tax paperwork", "Organizing a garage sale", "Debating an unrelated sports trivia question"]
  ];

  const INSTRUCTOR_TEXTS = [
    (t) => `Who teaches "${t}"?`,
    (t) => `Which instructor is assigned to "${t}"?`,
    (t) => `If you had a question about "${t}", who would you contact?`,
    (t) => `Whose name appears as the instructor for "${t}"?`,
    (t) => `Who is credited as the teacher of record for "${t}"?`,
    (t) => `Which instructor recorded the "${t}" lecture?`,
    (t) => `Who is listed as leading the "${t}" lesson?`,
    (t) => `Which of these people teaches "${t}"?`
  ];
  const INSTRUCTOR_DISTRACTORS = ["A guest panel", "An automated narrator", "No instructor is assigned"];

  const DURATION_TEXTS = [
    (t) => `Roughly how long is the "${t}" lecture designed to take?`,
    (t) => `What is the estimated runtime of "${t}"?`,
    (t) => `How much time should you budget for the "${t}" video?`,
    (t) => `Approximately how long does "${t}" run?`,
    (t) => `What duration is listed for the "${t}" lecture?`,
    (t) => `If you schedule time to watch "${t}", how long should you block off?`,
    (t) => `What's the listed length of the "${t}" video?`,
    (t) => `How long, roughly, will it take to get through "${t}"?`
  ];
  const DURATION_DISTRACTORS = ["3 hours", "1 week", "5 minutes"];

  const RESOURCE_TEXTS = [
    (t) => `Which resource should you check first if you get stuck during "${t}"?`,
    (t) => `Where should you look for extra help while working through "${t}"?`,
    (t) => `What's the recommended first step if a concept in "${t}" is unclear?`,
    (t) => `If you miss something in the "${t}" video, what should you consult?`,
    (t) => `Besides the video, what materials accompany "${t}"?`,
    (t) => `What should you review before asking for help with "${t}"?`,
    (t) => `Which materials are provided alongside the "${t}" lecture?`,
    (t) => `What's the best way to catch up on missed details in "${t}"?`
  ];
  const RESOURCE_CORRECT = "The lesson notes and slides provided";
  const RESOURCE_DISTRACTORS = ["A random search engine result", "Skipping ahead without reviewing", "Guessing and moving on"];

  const TF_ITEMS = [
    { text: (t) => `True or false: completing the assignment for "${t}" helps reinforce what the lecture covered.`, correct: "True" },
    { text: (t) => `True or false: skipping the assignment for "${t}" is the fastest way to master the material.`, correct: "False" },
    { text: (t) => `True or false: the quiz for "${t}" is meant to check understanding of the lecture.`, correct: "True" },
    { text: (t) => `True or false: the lesson notes for "${t}" are unrelated busywork with no connection to the video.`, correct: "False" },
    { text: (t) => `True or false: "${t}" includes both a quiz and an assignment.`, correct: "True" },
    { text: (t) => `True or false: you're expected to work through "${t}" without watching the video first.`, correct: "False" }
  ];

  const ASSIGNMENT_TEXTS = [
    (t) => `What kind of task follows the "${t}" lecture?`,
    (t) => `Which type of assignment is paired with "${t}"?`,
    (t) => `After watching "${t}", what are you asked to submit?`,
    (t) => `What category of assignment accompanies "${t}"?`,
    (t) => `Which best describes the follow-up task for "${t}"?`,
    (t) => `What sort of exercise closes out the "${t}" lesson?`
  ];

  const QUIZCOUNT_TEXTS = [
    (t) => `How many quiz questions accompany "${t}"?`,
    (t) => `What is the total number of quiz questions for "${t}"?`,
    (t) => `How many questions make up the "${t}" quiz?`,
    (t) => `If you complete every question in the "${t}" quiz, how many will you have answered?`
  ];

  const LESSONID_TEXTS = [
    (t) => `What is the internal lesson ID number for "${t}"?`,
    (t) => `Which numeric ID is assigned to "${t}" in the system?`,
    (t) => `What ID number identifies "${t}" internally?`,
    (t) => `In the course database, what ID is used for "${t}"?`
  ];

  const WORDCOUNT_TEXTS = [
    (t) => `How many words are in the title "${t}"?`,
    (t) => `What is the word count of this lesson's title?`,
    (t) => `Counting each word, how long is the title "${t}"?`
  ];

  const FIRSTWORD_TEXTS = [
    (t) => `What is the first word of the title "${t}"?`,
    (t) => `Which word begins the title "${t}"?`
  ];

  function buildQuizTemplates() {
    const templates = [];

    FOCUS_TEXTS.forEach((textFn, i) => {
      templates.push((lesson) => ({
        q: textFn(lesson.title),
        correct: lesson.description,
        distractors: FOCUS_DISTRACTOR_POOLS[i % FOCUS_DISTRACTOR_POOLS.length]
      }));
    });

    INSTRUCTOR_TEXTS.forEach((textFn) => {
      templates.push((lesson) => ({
        q: textFn(lesson.title),
        correct: lesson.instructor,
        distractors: INSTRUCTOR_DISTRACTORS
      }));
    });

    DURATION_TEXTS.forEach((textFn) => {
      templates.push((lesson) => ({
        q: textFn(lesson.title),
        correct: lesson.duration,
        distractors: DURATION_DISTRACTORS
      }));
    });

    RESOURCE_TEXTS.forEach((textFn) => {
      templates.push((lesson) => ({
        q: textFn(lesson.title),
        correct: RESOURCE_CORRECT,
        distractors: RESOURCE_DISTRACTORS
      }));
    });

    TF_ITEMS.forEach((item) => {
      templates.push((lesson) => ({
        q: item.text(lesson.title),
        correct: item.correct,
        distractors: [item.correct === "True" ? "False" : "True"]
      }));
    });

    // File metadata (10 templates)
    templates.push((lesson) => ({
      q: `What file format are the "${lesson.title}" lesson notes provided in?`,
      correct: fileExtension(lesson.notes),
      distractors: ["DOCX", "PPTX", "ZIP"]
    }));
    templates.push((lesson) => ({
      q: `What file format are the "${lesson.title}" slides provided in?`,
      correct: fileExtension(lesson.slides),
      distractors: ["DOCX", "PNG", "ZIP"]
    }));
    templates.push((lesson) => ({
      q: `What file format is the "${lesson.title}" video lecture provided in?`,
      correct: fileExtension(lesson.video),
      distractors: ["AVI", "MOV", "WMV"]
    }));
    templates.push((lesson) => ({
      q: `Which folder path contains the video file for "${lesson.title}"?`,
      correct: folderOf(lesson.video),
      distractors: ["media/misc/", "downloads/temp/", "archive/old/"]
    }));
    templates.push((lesson) => ({
      q: `What is the base file name (without extension) of the video used in "${lesson.title}"?`,
      correct: fileBasename(lesson.video),
      distractors: ["lecture-final", "untitled-video", "raw-footage"]
    }));
    templates.push((lesson) => ({
      q: `What is the base file name of the notes PDF for "${lesson.title}"?`,
      correct: fileBasename(lesson.notes),
      distractors: ["draft-notes", "misc-handout", "old-outline"]
    }));
    templates.push((lesson) => ({
      q: `What is the base file name of the slides PDF for "${lesson.title}"?`,
      correct: fileBasename(lesson.slides),
      distractors: ["backup-slides", "template-deck", "unused-slides"]
    }));
    templates.push((lesson) => ({
      q: `If you download the slides for "${lesson.title}", what type of file will you get?`,
      correct: fileExtension(lesson.slides),
      distractors: ["a ZIP archive", "an EXE installer", "a raw image file"]
    }));
    templates.push((lesson) => ({
      q: `True or false: the notes and slides for "${lesson.title}" share the same base file name.`,
      correct: fileBasename(lesson.notes) === fileBasename(lesson.slides) ? "True" : "False",
      distractors: [fileBasename(lesson.notes) === fileBasename(lesson.slides) ? "False" : "True"]
    }));
    templates.push((lesson) => ({
      q: `Which lesson does the video file "${fileBasename(lesson.video)}.${fileExtension(lesson.video).toLowerCase()}" belong to?`,
      correct: lesson.title,
      distractors: ["Intro to a Different Topic", "Advanced Widget Basics", "Legacy System Overview"]
    }));

    ASSIGNMENT_TEXTS.forEach((textFn) => {
      templates.push((lesson) => {
        const correct = assignmentKindLabel(lesson.assignment);
        const others = ASSIGNMENT_KIND_LABELS.filter(l => l !== correct);
        return {
          q: textFn(lesson.title),
          correct,
          distractors: [...others, "no assignment is required for this lesson"]
        };
      });
    });

    QUIZCOUNT_TEXTS.forEach((textFn) => {
      templates.push((lesson) => ({
        q: textFn(lesson.title),
        correct: String(lesson.quiz),
        distractors: ["5", "10", "25"]
      }));
    });

    LESSONID_TEXTS.forEach((textFn) => {
      templates.push((lesson) => ({
        q: textFn(lesson.title),
        correct: String(lesson.id),
        distractors: [String(Number(lesson.id) + 1), String(Number(lesson.id) - 1), String(Number(lesson.id) + 100)]
      }));
    });

    WORDCOUNT_TEXTS.forEach((textFn) => {
      templates.push((lesson) => {
        const n = wordCount(lesson.title);
        return {
          q: textFn(lesson.title),
          correct: String(n),
          distractors: [String(n + 1), String(n + 2), String(Math.max(1, n - 1))]
        };
      });
    });

    FIRSTWORD_TEXTS.forEach((textFn) => {
      templates.push((lesson) => ({
        q: textFn(lesson.title),
        correct: firstWord(lesson.title),
        distractors: ["The", "New", "Basic"]
      }));
    });

    templates.push((lesson) => ({
      q: `Ignoring punctuation, what is the last word of this lesson's description?`,
      correct: lastWord(lesson.description),
      distractors: ["today", "here", "now"]
    }));
    templates.push((lesson) => ({
      q: `What are the instructor's initials for "${lesson.title}"?`,
      correct: initialsOf(lesson.instructor),
      distractors: ["A.B.", "X.Y.", "Q.R."]
    }));

    return templates;
  }

  const QUIZ_TEMPLATES = buildQuizTemplates();

  // Turns a lesson's `quiz: <number>` field into a full array of
  // { q, options, answer } objects the lesson page can render directly.
  // Picks `count` DISTINCT templates (never the same template twice for
  // one lesson) so questions never repeat, as long as count stays within
  // QUIZ_TEMPLATES.length (currently ~71, comfortably above the 60 used
  // by every course in the catalog).
  function generateQuiz(lesson, count) {
    const orderSeed = hashSeed(`${lesson.id}-quiz-order`);
    const templateOrder = seededShuffle(QUIZ_TEMPLATES.map((_, i) => i), orderSeed);
    const chosen = templateOrder.slice(0, Math.min(count, QUIZ_TEMPLATES.length));

    return chosen.map((templateIndex, i) => {
      const template = QUIZ_TEMPLATES[templateIndex](lesson);
      const seed = hashSeed(`${lesson.id}-quiz-${i}`);
      // Never let a distractor accidentally equal the correct answer
      // (can happen with data-derived distractors like initials or IDs).
      const uniqueDistractors = template.distractors.filter(d => d !== template.correct);
      const options = seededShuffle([template.correct, ...uniqueDistractors], seed);
      return {
        q: template.q,
        options,
        answer: options.indexOf(template.correct)
      };
    });
  }

  const ASSIGNMENT_TEMPLATES = [
    (lesson) => ({
      title: `Reflection: ${lesson.title}`,
      brief: `In 3–5 sentences, summarize the key idea behind this lecture and note one open question you still have.`,
      submitLabel: "Submit reflection"
    }),
    (lesson) => ({
      title: `Apply it: ${lesson.title}`,
      brief: `Describe how you would apply what you learned in this lecture to a real project you're working on or interested in.`,
      submitLabel: "Submit response"
    }),
    (lesson) => ({
      title: `Practice task: ${lesson.title}`,
      brief: `Outline the concrete steps you'd take to complete a small hands-on exercise based on this lesson's material.`,
      submitLabel: "Submit outline"
    })
  ];

  // Turns a lesson's `assignment: <number>` field into the full
  // { title, brief, submitLabel } object the lesson page needs.
  function generateAssignment(kind, lesson) {
    const template = ASSIGNMENT_TEMPLATES[(Number(kind) - 1 + ASSIGNMENT_TEMPLATES.length * 10) % ASSIGNMENT_TEMPLATES.length];
    return template(lesson);
  }

  // Expands a lightweight raw lesson record into everything the lesson
  // page needs to build itself, merging in the live completion flag.
  function hydrateLesson(rawLesson, completed) {
    return Object.assign({}, rawLesson, {
      quiz: generateQuiz(rawLesson, rawLesson.quiz),
      assignment: generateAssignment(rawLesson.assignment, rawLesson),
      completed: completed
    });
  }

  /* ----------------------------------------------------------------------
     3. PROGRESS / ENROLLMENT / ACTIVITY STORAGE (localStorage)
     ---------------------------------------------------------------------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function getProgressStore(email) {
    return readJSON(scopedKey(PROGRESS_KEY, email), {});
  }
  function saveProgressStore(store, email) {
    writeJSON(scopedKey(PROGRESS_KEY, email), store);
  }

  // A freshly-enrolled course always starts with zero completed lessons —
  // real progress is only ever earned by actually finishing lessons in
  // lesson.html. (The `completed:` flags in RAW_COURSES above are just
  // catalog scaffolding and are intentionally NOT used to seed progress.)
  function ensureCourseSeeded(courseId, email) {
    const store = getProgressStore(email);
    if (!store[courseId]) {
      store[courseId] = { completedLessonIds: [] };
      saveProgressStore(store, email);
    }
    return store;
  }

  /* ----------------------------------------------------------------------
     ASSIGNMENT SUBMISSIONS
     -------------------------------------------------------------------------
     Scoped per-student like everything else above, keyed courseId → lessonId.
     A resubmission just overwrites the previous text/timestamp — only the
     latest response is what the instructor needs to see. getCourseAssignmentSubmissions()
     is the instructor-facing read: it walks every student ever registered
     on this device (course-data.js's own USERS_KEY registry) and collects
     their submissions for one course, newest first, so instructor-dashboard.html
     can list them without knowing anything about individual students up front.
     ---------------------------------------------------------------------- */
  function getAssignmentStore(email) {
    return readJSON(scopedKey(ASSIGN_KEY, email), {});
  }
  function saveAssignmentStore(store, email) {
    writeJSON(scopedKey(ASSIGN_KEY, email), store);
  }
  // `data` is either a plain string (legacy text-only callers) or a
  // payload object: { text, hasFile, fileName, fileSize, fileType }.
  // The file's actual bytes (when submissionType requires an upload —
  // pdf/image/video/file) live in IndexedDB via saveSubmissionFile();
  // this record only carries the lightweight metadata so instructor
  // dashboards can render instantly without touching IndexedDB.
  function submitAssignment(courseId, lessonId, data, email) {
    const store = getAssignmentStore(email);
    if (!store[courseId]) store[courseId] = {};
    const payload = (typeof data === "string") ? { text: data } : (data || {});
    const record = {
      text: String(payload.text || "").trim(),
      hasFile: !!payload.hasFile,
      fileName: payload.hasFile ? (payload.fileName || null) : null,
      fileSize: payload.hasFile ? (payload.fileSize || null) : null,
      fileType: payload.hasFile ? (payload.fileType || null) : null,
      submittedAt: new Date().toISOString()
    };
    store[courseId][lessonId] = record;
    saveAssignmentStore(store, email);
    return record;
  }
  function getAssignmentSubmission(courseId, lessonId, email) {
    const store = getAssignmentStore(email);
    return (store[courseId] && store[courseId][lessonId]) || null;
  }
  function getCourseAssignmentSubmissions(courseId) {
    const raw = RAW_COURSES[courseId];
    if (!raw || typeof global.getAllUsers !== "function") return [];
    const out = [];
    getAllUsers().forEach((u) => {
      if (!u || !u.name || !u.email) return;
      const byLesson = getAssignmentStore(u.email)[courseId];
      if (!byLesson) return;
      Object.keys(byLesson).forEach((lessonId) => {
        const rec = byLesson[lessonId];
        if (!rec || (!rec.text && !rec.hasFile)) return;
        const lesson = raw.lessons.find(l => String(l.id) === String(lessonId));
        out.push({
          studentName: u.name,
          studentEmail: u.email,
          lessonId: Number(lessonId),
          lessonTitle: lesson ? lesson.title : `Lesson ${lessonId}`,
          text: rec.text,
          hasFile: !!rec.hasFile,
          fileName: rec.fileName || null,
          fileSize: rec.fileSize || null,
          fileType: rec.fileType || null,
          submittedAt: rec.submittedAt
        });
      });
    });
    out.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return out;
  }

  function getStudentAssignmentSubmissions(courseId, email) {
    const raw = RAW_COURSES[courseId];
    if (!raw) return [];
    const byLesson = getAssignmentStore(email)[courseId];
    if (!byLesson) return [];
    const out = Object.keys(byLesson).map((lessonId) => {
      const rec = byLesson[lessonId];
      const lesson = raw.lessons.find(l => String(l.id) === String(lessonId));
      return {
        lessonId: Number(lessonId),
        lessonTitle: lesson ? lesson.title : `Lesson ${lessonId}`,
        text: rec.text,
        hasFile: !!rec.hasFile,
        fileName: rec.fileName || null,
        fileSize: rec.fileSize || null,
        fileType: rec.fileType || null,
        submittedAt: rec.submittedAt
      };
    }).filter(r => r.text || r.hasFile);
    out.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    return out;
  }

  /* ----------------------------------------------------------------------
     ASSIGNMENT SUBMISSION FILES (IndexedDB blobs)
     -------------------------------------------------------------------------
     Text submissions fit fine in the localStorage record above, but a PDF,
     image, or video the student uploads does not — so, mirroring the
     instructor-material pattern in instructor-data.js, the actual bytes
     live in their own IndexedDB store, keyed by course:lesson:student, and
     submitAssignment()'s localStorage record above only carries the
     lightweight name/size/type metadata needed to render lists instantly.
     ---------------------------------------------------------------------- */
  const SUBFILE_DB_NAME = "techbridge_submission_files";
  const SUBFILE_DB_VERSION = 1;
  const SUBFILE_STORE = "files";

  function openSubmissionDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in global)) {
        reject(new Error("This browser doesn't support saving files."));
        return;
      }
      const req = indexedDB.open(SUBFILE_DB_NAME, SUBFILE_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SUBFILE_STORE)) {
          db.createObjectStore(SUBFILE_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function submissionFileKey(courseId, lessonId, email) {
    const scope = (email ? String(email) : (getCurrentUserEmail() || "guest")).trim().toLowerCase();
    return `${courseId}:${lessonId}:${scope}`;
  }

  // Saves/replaces the file a student uploaded for one lesson's assignment.
  // Returns a Promise<meta>.
  function saveSubmissionFile(courseId, lessonId, file, email) {
    const key = submissionFileKey(courseId, lessonId, email);
    const meta = { name: file.name, size: file.size, type: file.type, savedAt: new Date().toISOString() };
    return openDBWrite(key, file, meta);
  }
  function openDBWrite(key, blob, meta) {
    return openSubmissionDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(SUBFILE_STORE, "readwrite");
      tx.objectStore(SUBFILE_STORE).put(Object.assign({ key, blob }, meta));
      tx.oncomplete = () => resolve(meta);
      tx.onerror = () => reject(tx.error);
    }));
  }

  function getSubmissionFile(courseId, lessonId, email) {
    const key = submissionFileKey(courseId, lessonId, email);
    return openSubmissionDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(SUBFILE_STORE, "readonly");
      const req = tx.objectStore(SUBFILE_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    }));
  }

  // Convenience for dashboards: resolves to a playable/openable object URL
  // + display info, or null if no file was ever uploaded for this slot.
  function getSubmissionFileURL(courseId, lessonId, email) {
    return getSubmissionFile(courseId, lessonId, email).then(rec => {
      if (!rec || !rec.blob) return null;
      return { url: URL.createObjectURL(rec.blob), name: rec.name, size: rec.size, type: rec.type };
    });
  }

  function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* ----------------------------------------------------------------------
     QUIZ RESULTS
     -------------------------------------------------------------------------
     Scoped per-student like assignments, keyed courseId -> lessonId. Every
     submission in lesson.html calls saveQuizResult(), which keeps the most
     recent attempt (score, pass/fail, timestamp) plus a running attempt
     count and best score. getCourseQuizResults() is the instructor-facing
     read for one student across a whole course, used by the "Students on
     this device" detail modal.
     ---------------------------------------------------------------------- */
  function getQuizResultsStore(email) {
    return readJSON(scopedKey(QUIZ_RESULTS_KEY, email), {});
  }
  function saveQuizResultsStore(store, email) {
    writeJSON(scopedKey(QUIZ_RESULTS_KEY, email), store);
  }
  function saveQuizResult(courseId, lessonId, correct, total, passed, email) {
    const store = getQuizResultsStore(email);
    if (!store[courseId]) store[courseId] = {};
    const prev = store[courseId][lessonId];
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const record = {
      correct,
      total,
      pct,
      passed: !!passed,
      attempts: (prev ? prev.attempts : 0) + 1,
      bestPct: Math.max(pct, prev ? prev.bestPct || 0 : 0),
      lastAttemptAt: new Date().toISOString()
    };
    store[courseId][lessonId] = record;
    saveQuizResultsStore(store, email);
    return record;
  }
  function getQuizResult(courseId, lessonId, email) {
    const store = getQuizResultsStore(email);
    return (store[courseId] && store[courseId][lessonId]) || null;
  }
  function getCourseQuizResults(courseId, email) {
    const raw = RAW_COURSES[courseId];
    if (!raw) return [];
    const byLesson = getQuizResultsStore(email)[courseId];
    if (!byLesson) return [];
    const out = Object.keys(byLesson).map((lessonId) => {
      const rec = byLesson[lessonId];
      const lesson = raw.lessons.find(l => String(l.id) === String(lessonId));
      return Object.assign({
        lessonId: Number(lessonId),
        lessonTitle: lesson ? lesson.title : `Lesson ${lessonId}`
      }, rec);
    });
    // Keep it in the course's natural lesson order rather than object-key order.
    out.sort((a, b) => {
      const ia = raw.lessons.findIndex(l => l.id === a.lessonId);
      const ib = raw.lessons.findIndex(l => l.id === b.lessonId);
      return ia - ib;
    });
    return out;
  }

  function getCertificateStore(email) {
    return readJSON(scopedKey(CERT_KEY, email), {});
  }
  function saveCertificateStore(store, email) {
    writeJSON(scopedKey(CERT_KEY, email), store);
  }

  // ---- Enrollment: which courses THIS student is actually taking. ------
  function getEnrollmentStore(email) {
    return readJSON(scopedKey(ENROLL_KEY, email), {});
  }
  function saveEnrollmentStore(store, email) {
    writeJSON(scopedKey(ENROLL_KEY, email), store);
  }
  function getEnrolledCourseIds(email) {
    return Object.keys(getEnrollmentStore(email)).filter(id => !!RAW_COURSES[id]);
  }
  function isEnrolled(courseId, email) {
    return !!getEnrollmentStore(email)[courseId];
  }
  // Add more courses: called from the dashboard's "Add a course" picker,
  // and also used once at signup-bridge time to enroll the track chosen
  // on signup.html.
  function enrollInCourse(courseId, email) {
    if (!RAW_COURSES[courseId]) return false;
    const store = getEnrollmentStore(email);
    if (!store[courseId]) {
      store[courseId] = { enrolledAt: new Date().toISOString() };
      saveEnrollmentStore(store, email);
      ensureCourseSeeded(courseId, email);
    }
    return true;
  }
  function getEnrollmentDate(courseId, email) {
    const store = getEnrollmentStore(email);
    return store[courseId] ? new Date(store[courseId].enrolledAt) : null;
  }

  // ---- Activity tracking: powers the streak + "hours this week" stat. --
  function logActivityToday(email) {
    const key = scopedKey(ACTIVITY_KEY, email);
    const days = readJSON(key, []);
    const today = new Date().toISOString().slice(0, 10);
    if (!days.includes(today)) {
      days.push(today);
      writeJSON(key, days);
    }
  }
  function getCurrentStreak(email) {
    const days = new Set(readJSON(scopedKey(ACTIVITY_KEY, email), []));
    let streak = 0;
    const cursor = new Date();
    // Count backwards from today while each day has logged activity.
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }
  function logCompletionMinutes(minutes, email) {
    const key = scopedKey(HOURS_LOG_KEY, email);
    const log = readJSON(key, []);
    log.push({ date: new Date().toISOString(), minutes: minutes || 0 });
    writeJSON(key, log);
  }
  function getHoursThisWeek(email) {
    const log = readJSON(scopedKey(HOURS_LOG_KEY, email), []);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const minutes = log
      .filter(e => new Date(e.date).getTime() >= weekAgo)
      .reduce((sum, e) => sum + e.minutes, 0);
    return Math.round((minutes / 60) * 10) / 10;
  }

  /* ----------------------------------------------------------------------
     4. PUBLIC API
     ---------------------------------------------------------------------- */

  function listCourseIds() {
    return Object.keys(RAW_COURSES);
  }

  // Read course ID → load saved progress → return a fully hydrated course.
  // `email` is optional and defaults to the currently signed-in student;
  // pass it explicitly to read a specific student's progress instead
  // (used by the instructor dashboard's student roster).
  // A course's `instructor` field (and each lesson's) starts out as the
  // static name baked into RAW_COURSES below, but the moment a real
  // instructor account (instructor-data.js) is registered for a course,
  // that live name should be what students actually see everywhere —
  // dashboard, programs, certificate, lesson pages — without having to
  // touch the catalog itself. This is the single place that override
  // happens; everything else just calls getRawCourse()/getCourse().
  function withLiveInstructorName(raw) {
    if (!raw) return raw;
    if (typeof global.instructorForCourse !== "function") return raw;
    const live = global.instructorForCourse(raw.id);
    if (!live || !live.name || live.name === raw.instructor) return raw;
    return Object.assign({}, raw, {
      instructor: live.name,
      lessons: raw.lessons.map(l => Object.assign({}, l, { instructor: live.name }))
    });
  }

  function getRawCourse(courseId) {
    return withLiveInstructorName(RAW_COURSES[courseId]) || null;
  }

  function getCourse(courseId, email) {
    const raw = getRawCourse(courseId);
    if (!raw) return null;
    const store = ensureCourseSeeded(courseId, email);
    const completedIds = new Set(store[courseId].completedLessonIds);
    const lessons = raw.lessons.map(l => hydrateLesson(l, completedIds.has(l.id)));
    return Object.assign({}, raw, { lessons });
  }

  function getLesson(courseId, lessonId, email) {
    const course = getCourse(courseId, email);
    if (!course) return null;
    return course.lessons.find(l => String(l.id) === String(lessonId)) || null;
  }

  // Find current lesson: first incomplete lesson, or the last lesson if
  // the whole course is already done (used for "Continue"/"Review").
  function getCurrentLesson(courseId, email) {
    const course = getCourse(courseId, email);
    if (!course || !course.lessons.length) return null;
    return course.lessons.find(l => !l.completed) || course.lessons[course.lessons.length - 1];
  }

  function getNextLesson(courseId, lessonId, email) {
    const course = getCourse(courseId, email);
    if (!course) return null;
    const idx = course.lessons.findIndex(l => String(l.id) === String(lessonId));
    if (idx === -1) return null;
    return course.lessons[idx + 1] || null;
  }

  function isLessonComplete(lesson) {
    return !!(lesson && lesson.completed);
  }

  // Update progress: mark a lesson complete/incomplete and persist it.
  // Marking a lesson complete also logs today's activity (streak) and the
  // lesson's duration (weekly hours) so the dashboard reflects real use.
  function setLessonComplete(courseId, lessonId, value, email) {
    ensureCourseSeeded(courseId, email);
    const store = getProgressStore(email);
    const set = new Set(store[courseId].completedLessonIds);
    const wasComplete = set.has(Number(lessonId));
    if (value) set.add(Number(lessonId)); else set.delete(Number(lessonId));
    store[courseId].completedLessonIds = Array.from(set);
    saveProgressStore(store, email);

    if (value && !wasComplete) {
      logActivityToday(email);
      const raw = RAW_COURSES[courseId];
      const rawLesson = raw ? raw.lessons.find(l => String(l.id) === String(lessonId)) : null;
      if (rawLesson) logCompletionMinutes(parseDurationMinutes(rawLesson.duration), email);
    }
  }

  function getCourseCompletionPercent(courseId, email) {
    const course = getCourse(courseId, email);
    if (!course || !course.lessons.length) return 0;
    const done = course.lessons.filter(l => l.completed).length;
    return Math.round((done / course.lessons.length) * 100);
  }

  function isCourseComplete(courseId, email) {
    const course = getCourse(courseId, email);
    return !!course && course.lessons.length > 0 && course.lessons.every(l => l.completed);
  }

  // A course being 100% complete only means the student watched every
  // lecture, passed every quiz, and turned in every assignment — it does
  // NOT by itself earn a certificate. The instructor assigned to the
  // course still has to review that work and mark the student "qualified"
  // (instructor-data.js's qualifyStudent/isStudentQualified) before
  // issueCertificate() is allowed to actually generate one. If
  // instructor-data.js hasn't loaded on a given page for some reason, we
  // fail open (course completion alone is enough) rather than silently
  // block every certificate.
  function isCertificateEligible(courseId, email) {
    if (!isCourseComplete(courseId, email)) return false;
    if (typeof global.isStudentQualified !== "function") return true;
    const who = email || getCurrentUserEmail();
    return global.isStudentQualified(courseId, who);
  }

  // Generate certificate automatically once a course hits 100% AND the
  // instructor has qualified the student. Calling this before the
  // instructor has signed off is a no-op (returns null) — it never issues
  // a certificate on completion alone.
  function issueCertificate(courseId, email) {
    if (!isCertificateEligible(courseId, email)) return null;
    const store = getCertificateStore(email);
    if (!store[courseId]) {
      store[courseId] = { issuedAt: new Date().toISOString() };
      saveCertificateStore(store, email);
    }
    return store[courseId];
  }

  function getCertificate(courseId, email) {
    return getCertificateStore(email)[courseId] || null;
  }

  function parseDurationMinutes(durationStr) {
    const match = /(\d+)/.exec(durationStr || "");
    return match ? parseInt(match[1], 10) : 0;
  }

  // Rolled-up numbers for the dashboard stat cards, computed from real,
  // per-student progress — scoped ONLY to courses this student is
  // actually enrolled in (not the full 16-course catalog).
  function getOverallStats(email) {
    const ids = getEnrolledCourseIds(email);
    if (!ids.length) {
      return {
        coursesInProgress: 0, coursesTotal: 0, avgCompletion: 0,
        certificates: 0, hoursCompleted: 0, hoursThisWeek: 0,
        weeklyGoalHours: 0, streak: 0
      };
    }
    let inProgress = 0, totalPct = 0, certs = 0, completedMinutes = 0;
    ids.forEach(id => {
      const course = getCourse(id, email);
      const pct = getCourseCompletionPercent(id, email);
      totalPct += pct;
      if (pct > 0 && pct < 100) inProgress++;
      if (getCertificate(id, email)) certs++;
      course.lessons.forEach(l => { if (l.completed) completedMinutes += parseDurationMinutes(l.duration); });
    });
    return {
      coursesInProgress: inProgress,
      coursesTotal: ids.length,
      avgCompletion: Math.round(totalPct / ids.length),
      certificates: certs,
      hoursCompleted: Math.round((completedMinutes / 60) * 10) / 10,
      hoursThisWeek: getHoursThisWeek(email),
      weeklyGoalHours: Math.max(3, ids.length * 3),
      streak: getCurrentStreak(email)
    };
  }

  // A rough but real "deadline": each enrolled course is assumed to run
  // on a weekly cadence starting from the day the student enrolled. The
  // Nth not-yet-reached lesson is "due" N weeks after enrollment. Once a
  // course is finished it drops off the list entirely.
  function getCourseDeadline(courseId, email) {
    const course = getCourse(courseId, email);
    if (!course || isCourseComplete(courseId, email)) return null;
    const enrolledAt = getEnrollmentDate(courseId, email) || new Date();
    const completedCount = course.lessons.filter(l => l.completed).length;
    const current = getCurrentLesson(courseId, email);
    const dueDate = new Date(enrolledAt.getTime());
    dueDate.setDate(dueDate.getDate() + (completedCount + 1) * 7);
    return {
      courseId,
      courseCategory: course.category,
      courseTitle: course.title,
      lessonTitle: current ? current.title : null,
      lessonId: current ? current.id : null,
      dueDate
    };
  }
  function getUpcomingDeadlines(email) {
    return getEnrolledCourseIds(email)
      .map(id => getCourseDeadline(id, email))
      .filter(Boolean)
      .sort((a, b) => a.dueDate - b.dueDate);
  }

  // Achievements are computed from real activity instead of being
  // hardcoded on/off in the HTML. Certificate badges are appended, one
  // per completed & enrolled course.
  function getAchievements(email) {
    const stats = getOverallStats(email);
    const badges = [
      { id: "streak5", icon: "&#9889;", label: "5-Day Streak", unlocked: stats.streak >= 5 },
      { id: "hours50", icon: "&#127775;", label: "50 Hours", unlocked: stats.hoursCompleted >= 50 },
      { id: "topcohort", icon: "&#9733;", label: "High Achiever", unlocked: stats.coursesTotal > 0 && stats.avgCompletion >= 90 }
    ];
    getEnrolledCourseIds(email).forEach(id => {
      if (getCertificate(id, email)) {
        const course = getCourse(id, email);
        badges.push({
          id: "cert-" + id,
          icon: "&#127942;",
          label: (course.title.split(" ")[0]) + " Cert",
          unlocked: true
        });
      }
    });
    return badges;
  }

  global.getCourse = getCourse;
  global.getRawCourse = getRawCourse;
  global.getLesson = getLesson;
  global.getCurrentLesson = getCurrentLesson;
  global.getNextLesson = getNextLesson;
  global.isLessonComplete = isLessonComplete;
  global.setLessonComplete = setLessonComplete;
  global.getCourseCompletionPercent = getCourseCompletionPercent;
  global.isCourseComplete = isCourseComplete;
  global.isCertificateEligible = isCertificateEligible;
  global.issueCertificate = issueCertificate;
  global.getCertificate = getCertificate;
  global.getOverallStats = getOverallStats;
  global.listCourseIds = listCourseIds;

  global.trackNameToCourseId = trackNameToCourseId;
  global.getEnrolledCourseIds = getEnrolledCourseIds;
  global.isEnrolled = isEnrolled;
  global.enrollInCourse = enrollInCourse;
  global.getEnrollmentDate = getEnrollmentDate;
  global.getUpcomingDeadlines = getUpcomingDeadlines;
  global.getAchievements = getAchievements;
  global.getCurrentStreak = getCurrentStreak;

  global.getCurrentUserEmail = getCurrentUserEmail;
  global.getAllUsers = getAllUsers;
  global.registerUser = registerUser;

  global.submitAssignment = submitAssignment;
  global.getAssignmentSubmission = getAssignmentSubmission;
  global.getCourseAssignmentSubmissions = getCourseAssignmentSubmissions;
  global.getStudentAssignmentSubmissions = getStudentAssignmentSubmissions;

  global.saveSubmissionFile = saveSubmissionFile;
  global.getSubmissionFile = getSubmissionFile;
  global.getSubmissionFileURL = getSubmissionFileURL;
  global.formatFileSize = formatFileSize;

  global.saveQuizResult = saveQuizResult;
  global.getQuizResult = getQuizResult;
  global.getCourseQuizResults = getCourseQuizResults;

})(window);