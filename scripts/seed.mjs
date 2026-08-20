// Seeds a realistic-looking workspace (team, projects, 500 team tasks, and
// 300 personal tasks) for one existing account. Run with: npm run seed -- <email>
// Wipes that account's own tasks/projects/owned teams first, then rebuilds.

import connectDB from "../src/lib/db.js";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Team from "../src/models/Team.js";
import Project from "../src/models/Project.js";
import Task from "../src/models/Task.js";
import ActivityLog from "../src/models/ActivityLog.js";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function daysAgo(n) { return new Date(now - n * DAY); }
function daysFromNow(n) { return new Date(now + n * DAY); }
function pickWeighted(items) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) { roll -= item.weight; if (roll <= 0) return item.value; }
  return items[items.length - 1].value;
}
function sample(arr, n, weights) {
  const pool = arr.map((value, i) => ({ value, weight: weights ? weights[i] : 1 }));
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((sum, p) => sum + p.weight, 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) { roll -= pool[idx].weight; if (roll <= 0) break; }
    out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0].value);
  }
  return out;
}

// --- Synthetic teammates -----------------------------------------------
const SEED_EMAIL_DOMAIN = "seedcrew.local";
const TEAMMATES = [
  { firstname: "Ananya", lastname: "Sharma", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  { firstname: "Rohan", lastname: "Mehta", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
  { firstname: "Priya", lastname: "Nair", city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
  { firstname: "Arjun", lastname: "Verma", city: "Delhi", state: "Delhi", pincode: "110001" },
  { firstname: "Kavya", lastname: "Iyer", city: "Pune", state: "Maharashtra", pincode: "411001" },
  { firstname: "Vikram", lastname: "Singh", city: "Hyderabad", state: "Telangana", pincode: "500001" },
  { firstname: "Neha", lastname: "Kapoor", city: "Kolkata", state: "West Bengal", pincode: "700001" },
  { firstname: "Aditya", lastname: "Rao", city: "Ahmedabad", state: "Gujarat", pincode: "380001" },
  { firstname: "Sneha", lastname: "Joshi", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
];

const PROJECTS = [
  { title: "Customer Portal Redesign", priority: "high" },
  { title: "Payments Platform Migration", priority: "urgent" },
  { title: "Mobile App v2", priority: "high" },
  { title: "Internal Admin Tools", priority: "medium" },
  { title: "Onboarding Flow Revamp", priority: "medium" },
  { title: "Performance & Reliability", priority: "high" },
];

// --- Task content generation --------------------------------------------
const TEMPLATES = [
  { verb: "Fix", type: "bug" }, { verb: "Debug", type: "bug" }, { verb: "Resolve", type: "bug" },
  { verb: "Implement", type: "feature" }, { verb: "Add", type: "feature" }, { verb: "Build", type: "feature" }, { verb: "Integrate", type: "feature" },
  { verb: "Design", type: "design" }, { verb: "Redesign", type: "design" },
  { verb: "Update", type: "chore" }, { verb: "Refactor", type: "chore" }, { verb: "Review", type: "chore" }, { verb: "Remove", type: "chore" }, { verb: "Deprecate", type: "chore" },
  { verb: "Migrate", type: "infra" }, { verb: "Set up", type: "infra" }, { verb: "Automate", type: "infra" },
  { verb: "Optimize", type: "performance" }, { verb: "Improve performance of", type: "performance" },
  { verb: "Investigate", type: "research" },
  { verb: "Audit", type: "security" }, { verb: "Harden", type: "security" },
  { verb: "Write tests for", type: "docs" }, { verb: "Document", type: "docs" },
];

const SUBJECTS = [
  "the login flow", "the checkout page", "user onboarding", "the notification system", "the search API",
  "the billing dashboard", "the mobile navigation", "dark mode support", "the CI pipeline", "database indexing",
  "the admin panel", "password reset emails", "the file upload flow", "rate limiting on the API", "the settings page",
  "session handling", "the analytics dashboard", "third-party OAuth login", "the comments feature", "the activity feed",
  "team invitations", "the CSV export feature", "webhook delivery", "the pricing page", "the onboarding checklist",
  "image compression on upload", "the calendar view", "drag-and-drop reordering", "empty states", "keyboard shortcuts",
  "the error boundary", "design system tokens", "the tablet layout", "the changelog page", "SSO for enterprise accounts",
  "API rate limits", "background job retries", "the audit log", "multi-currency support", "the referral program",
  "push notifications", "the invoice PDF generator", "two-factor authentication", "the search index", "the API docs site",
];

const DESCRIPTION_BY_TYPE = {
  bug: (s) => `Users have reported problems with ${s}. Reproduce the issue, find the root cause, and ship a fix.`,
  feature: (s) => `Add support for ${s} so the team can start using it in production.`,
  design: (s) => `Put together mockups and a short spec for ${s}, then review with the team before implementation.`,
  chore: (s) => `Clean up and bring ${s} in line with current conventions.`,
  infra: (s) => `Set up the tooling and pipeline needed for ${s}.`,
  performance: (s) => `${s[0].toUpperCase()}${s.slice(1)} has gotten slow under load — profile it and cut the response time.`,
  research: (s) => `Look into ${s} and write up findings with a recommendation.`,
  security: (s) => `Review ${s} for potential vulnerabilities and apply fixes.`,
  docs: (s) => `Write or update documentation and tests covering ${s}.`,
};

const LABEL_BY_TYPE = { bug: "bug", feature: "feature", design: "design", chore: "chore", infra: "infra", performance: "performance", research: "research", security: "security", docs: "docs" };
const EXTRA_LABELS = ["frontend", "backend", "mobile", "api"];

// Personal (no team/project) tasks — just the account owner's own to-dos.
const PERSONAL_TASKS = [
  { title: "Prep slides for the sprint review", description: "Pull together last week's metrics and put together a short deck for tomorrow's review." },
  { title: "Reply to vendor email about renewal", description: "The contract renewal email has been sitting in the inbox for a few days — send a reply with the updated terms." },
  { title: "Update resume with recent projects", description: "Add the last two shipped projects and refresh the skills section." },
  { title: "Clean up inbox and archive old threads", description: "Go through the backlog of old email threads and archive anything resolved." },
  { title: "Renew SSL certificate for staging", description: "The staging certificate expires soon — renew it before it lapses and breaks the environment." },
  { title: "Book flights for the offsite", description: "Compare a few options and book flights for the upcoming team offsite." },
  { title: "Fill out quarterly expense report", description: "Collect receipts from the last quarter and submit the expense report." },
  { title: "Schedule 1:1s with the team", description: "Block time on the calendar for individual check-ins with each direct report." },
  { title: "Review and sign the new NDA", description: "Legal sent over an updated NDA — read through it and get it signed." },
  { title: "Order new laptop for the new hire", description: "The new hire starts next month — order their laptop with enough lead time for setup." },
  { title: "Submit timesheet for last week", description: "Log hours for last week before the timesheet deadline." },
  { title: "Read up on the new compliance policy", description: "Go through the updated compliance policy doc and note anything that affects the team." },
  { title: "Renew the domain name", description: "The primary domain is up for renewal — renew it before it expires." },
  { title: "Back up the design files", description: "Make sure the latest design files are backed up somewhere outside the local machine." },
  { title: "Plan the team lunch", description: "Pick a place and send out an invite for next week's team lunch." },
  { title: "Cancel the unused SaaS subscription", description: "Noticed an old tool still billing monthly — cancel it before the next renewal." },
  { title: "Set up the new monitor", description: "Unbox and set up the new monitor that arrived at the desk." },
  { title: "Draft the Q3 goals doc", description: "Write a first draft of the Q3 goals so the team can review before finalizing." },
];
const PERSONAL_LABELS = ["personal", "admin", "planning", "errand"];

const SUBTASK_TITLES = ["Write unit tests", "Update documentation", "QA sign-off", "Code review", "Deploy to staging", "Get design approval", "Add analytics tracking", "Write changelog entry", "Fix review comments", "Write the migration script", "Cross-browser check", "Update the changelog", "Add error handling", "Wire up analytics events"];

const COMMENT_LINES = {
  doing: ["Started on this today.", "Making good progress, should be done by end of week.", "Ran into a blocker with the API, investigating.", "Halfway through, will update tomorrow."],
  completed: ["Shipped in the latest release.", "Verified in staging, closing this out.", "Done — QA signed off.", "Merged and deployed."],
  todo: ["Picking this up next sprint.", "Needs design input before starting.", "Adding this to the backlog for now.", "Waiting on prioritization."],
  on_hold: ["Blocked on a decision from the product team.", "Paused until the dependency is ready.", "On hold pending budget approval.", "Waiting for access to the staging environment."],
};

function titleFor() {
  const template = pick(TEMPLATES);
  const subject = pick(SUBJECTS);
  return { title: `${template.verb} ${subject}`, type: template.type, subject };
}

function labelsFor(type) {
  const labels = [LABEL_BY_TYPE[type]];
  if (Math.random() < 0.35) labels.push(pick(EXTRA_LABELS));
  return [...new Set(labels)];
}

function priorityFor(status) {
  const table = {
    todo: [{ value: "none", weight: 20 }, { value: "low", weight: 25 }, { value: "medium", weight: 30 }, { value: "high", weight: 18 }, { value: "urgent", weight: 7 }],
    doing: [{ value: "none", weight: 10 }, { value: "low", weight: 18 }, { value: "medium", weight: 32 }, { value: "high", weight: 28 }, { value: "urgent", weight: 12 }],
    completed: [{ value: "none", weight: 12 }, { value: "low", weight: 20 }, { value: "medium", weight: 32 }, { value: "high", weight: 26 }, { value: "urgent", weight: 10 }],
    on_hold: [{ value: "none", weight: 15 }, { value: "low", weight: 25 }, { value: "medium", weight: 30 }, { value: "high", weight: 20 }, { value: "urgent", weight: 10 }],
  };
  return pickWeighted(table[status]);
}

// Every branch always returns a real startDate and dueDate (never null),
// with startDate <= dueDate, so every task has a complete date range.
function datesFor(status) {
  if (status === "completed") {
    const createdAt = daysAgo(randInt(10, 150));
    const startDate = new Date(createdAt.getTime() + randInt(0, 2) * DAY);
    const dueDate = new Date(startDate.getTime() + randInt(3, 21) * DAY);
    return { createdAt, startDate, dueDate };
  }
  if (status === "doing") {
    const createdAt = daysAgo(randInt(1, 60));
    const startDate = createdAt;
    const dueDate = new Date(now + randInt(1, 14) * DAY);
    return { createdAt, startDate, dueDate };
  }
  if (status === "on_hold") {
    const createdAt = daysAgo(randInt(5, 120));
    const startDate = new Date(createdAt.getTime() + randInt(0, 3) * DAY);
    // Always derived from startDate (never independently from "now") so it
    // can never land before startDate. Blocked work is often overdue by now.
    const dueDate = new Date(startDate.getTime() + randInt(3, 40) * DAY);
    return { createdAt, startDate, dueDate };
  }
  // todo — scheduled to start soon, due further out.
  const createdAt = daysAgo(randInt(0, 90));
  const startDate = new Date(now + randInt(1, 10) * DAY);
  const dueDate = new Date(startDate.getTime() + randInt(5, 45) * DAY);
  return { createdAt, startDate, dueDate };
}

async function main() {
  const targetEmail = (process.argv[2] || "bbhupender100@gmail.com").toLowerCase().trim();
  await connectDB();

  const targetUser = await User.findOne({ email: targetEmail });
  if (!targetUser) {
    console.error(`No account found for ${targetEmail}. Register that account in the app first, then re-run.`);
    process.exit(1);
  }
  console.log(`Seeding for ${targetUser.firstname} ${targetUser.lastname} <${targetUser.email}>`);

  // --- Wipe this account's own data ---------------------------------
  const ownedTeams = await Team.find({ owner: targetUser._id }).select("_id");
  const ownedTeamIds = ownedTeams.map((t) => t._id);
  const tasksToDelete = await Task.find({ $or: [{ user: targetUser._id }, { team: { $in: ownedTeamIds } }] }).select("_id");
  const taskIds = tasksToDelete.map((t) => t._id);

  await Task.deleteMany({ $or: [{ user: targetUser._id }, { team: { $in: ownedTeamIds } }] });
  await Project.deleteMany({ $or: [{ user: targetUser._id }, { team: { $in: ownedTeamIds } }] });
  await ActivityLog.deleteMany({ $or: [{ team: { $in: ownedTeamIds } }, { entityType: "task", entityId: { $in: taskIds } }] });
  await Team.deleteMany({ _id: { $in: ownedTeamIds } });
  await User.deleteMany({ email: { $regex: `@${SEED_EMAIL_DOMAIN}$` } });
  console.log(`Wiped ${taskIds.length} old tasks, ${ownedTeamIds.length} owned team(s), and previous synthetic teammates.`);

  // --- Teammates -------------------------------------------------------
  const teammateDocs = TEAMMATES.map((person, i) => ({
    firstname: person.firstname,
    lastname: person.lastname,
    email: `${person.firstname.toLowerCase()}.${person.lastname.toLowerCase()}@${SEED_EMAIL_DOMAIN}`,
    password: "SeedTeammate123!",
    phone: `9${String(100000000 + i * 7654321 + randInt(0, 9999)).slice(0, 9)}`,
    address: { city: person.city, state: person.state, country: "India", pincode: person.pincode },
    isVerified: true,
    isGuest: false,
    role: "user",
  }));
  const teammates = await User.create(teammateDocs);
  console.log(`Created ${teammates.length} teammates.`);

  const allMembers = [targetUser, ...teammates];
  // A few people carry more work than others, like a real team.
  const memberWeights = allMembers.map((_, i) => (i === 0 ? 3 : [3, 3, 2, 2, 2, 1, 1, 1, 1].at(i - 1) ?? 1));

  // --- Team --------------------------------------------------------------
  const memberRoles = new Map();
  memberRoles.set(String(targetUser._id), "admin");
  teammates.forEach((m, i) => memberRoles.set(String(m._id), i < 2 ? "admin" : "editor"));
  const team = await Team.create({
    name: "Product Engineering",
    owner: targetUser._id,
    members: allMembers.map((m) => m._id),
    memberRoles,
  });
  console.log(`Created team "${team.name}".`);

  // --- Projects ------------------------------------------------------
  const projectDocs = PROJECTS.map((p) => ({
    title: p.title,
    description: `${p.title} — tracked by the Product Engineering team.`,
    priority: p.priority,
    dueDate: daysFromNow(randInt(20, 120)),
    lead: pick(allMembers)._id,
    members: sample(allMembers, randInt(3, allMembers.length)).map((m) => m._id),
    team: team._id,
    user: targetUser._id,
  }));
  const projects = await Project.insertMany(projectDocs);
  console.log(`Created ${projects.length} projects.`);

  function titleForDescription(title) {
    // Strip the leading verb so the description reads naturally.
    const words = title.split(" ");
    return words.slice(words[0] === "Write" || words[0] === "Improve" || words[0] === "Set" ? 3 : 1).join(" ") || title.toLowerCase();
  }

  // Shared: build one full task doc (dates, priority, comments) for either
  // a team-scoped or a personal task, given its content.
  function buildTaskDoc({ title, description, labels, project, taskTeam, isPrivate, assignees, reporter, watchers }) {
    const status = pickWeighted([
      { value: "todo", weight: 40 }, { value: "doing", weight: 25 }, { value: "completed", weight: 25 }, { value: "on_hold", weight: 10 },
    ]);
    const dates = datesFor(status);
    const priority = priorityFor(status);
    const comments = [];
    const commentLines = COMMENT_LINES[status];
    const commentCount = Math.random() < 0.25 ? 3 : Math.random() < 0.5 ? 2 : 1;
    for (let c = 0; c < commentCount; c++) {
      const author = pick([...assignees, reporter]);
      const commentAt = new Date(dates.createdAt.getTime() + randInt(0, 5) * DAY);
      comments.push({ body: pick(commentLines), author, createdAt: commentAt, updatedAt: commentAt });
    }
    return {
      title, description, status, priority,
      startDate: dates.startDate, dueDate: dates.dueDate,
      labels, project, team: taskTeam, private: isPrivate,
      assignees, reporter, watchers,
      user: targetUser._id,
      createdAt: dates.createdAt, updatedAt: dates.createdAt,
      comments,
    };
  }

  // --- 500 team-scoped tasks — every task gets a project/team, a full date
  // range, a description, labels, and at least one comment. ---------------
  const TEAM_TOTAL = 500;
  const taskDocs = [];
  for (let i = 0; i < TEAM_TOTAL; i++) {
    const generated = titleFor();
    const assigneeCount = Math.random() < 0.3 ? 2 : 1;
    const assignees = sample(allMembers, assigneeCount, memberWeights).map((m) => m._id);
    const reporter = pick(allMembers.slice(0, 4))._id; // a handful of people file most tickets
    taskDocs.push(buildTaskDoc({
      title: generated.title,
      description: DESCRIPTION_BY_TYPE[generated.type](titleForDescription(generated.title)),
      labels: labelsFor(generated.type),
      project: pick(projects)._id,
      taskTeam: team._id,
      isPrivate: Math.random() < 0.1,
      assignees,
      reporter,
      watchers: [...new Set([...assignees, reporter])],
    }));
  }

  // --- 300 personal tasks — no team/project, owned and assigned to just
  // the account holder, on top of the 500 team tasks above. ---------------
  const PERSONAL_TOTAL = 300;
  for (let i = 0; i < PERSONAL_TOTAL; i++) {
    const personal = pick(PERSONAL_TASKS);
    taskDocs.push(buildTaskDoc({
      title: personal.title,
      description: personal.description,
      labels: Math.random() < 0.4 ? [...new Set([pick(PERSONAL_LABELS), pick(PERSONAL_LABELS)])] : [pick(PERSONAL_LABELS)],
      project: null,
      taskTeam: null,
      isPrivate: false,
      assignees: [targetUser._id],
      reporter: targetUser._id,
      watchers: [targetUser._id],
    }));
  }

  const insertedTasks = await Task.insertMany(taskDocs, { ordered: false });
  console.log(`Created ${insertedTasks.length} tasks.`);

  // --- Multiple subtasks under every task, on top of the 500 -----------
  // Each subtask gets its own slice of the parent's start→due window, plus
  // a description, label, and comment, so nothing is left blank.
  const subtaskDocs = [];
  for (const parent of insertedTasks) {
    const subtaskCount = randInt(2, 5);
    const spanStart = parent.startDate.getTime();
    const spanEnd = Math.max(parent.dueDate.getTime(), spanStart + subtaskCount * DAY);
    const step = Math.max(1, Math.floor((spanEnd - spanStart) / DAY / subtaskCount));

    for (let i = 0; i < subtaskCount; i++) {
      const doneLean = parent.status === "completed" ? 0.75 : parent.status === "doing" ? 0.3 : 0.1;
      const status = Math.random() < doneLean ? "completed" : pickWeighted([{ value: "todo", weight: 45 }, { value: "doing", weight: 40 }, { value: "on_hold", weight: 15 }]);
      const subtaskTitle = pick(SUBTASK_TITLES);
      const startDate = new Date(spanStart + step * i * DAY + randInt(0, Math.max(1, step - 1)) * DAY / 2);
      const dueDate = new Date(Math.min(startDate.getTime() + randInt(1, Math.max(2, step)) * DAY, spanEnd));
      const priority = parent.priority === "urgent" || parent.priority === "high" ? pick(["medium", "high"]) : pick(["none", "low", "medium"]);
      const assignees = parent.assignees.length ? [pick(parent.assignees)] : [pick(allMembers)._id];
      const label = parent.labels?.length ? parent.labels[0] : "chore";
      const commentAt = new Date(startDate.getTime() + randInt(0, 2) * DAY);

      subtaskDocs.push({
        title: subtaskTitle,
        description: `${subtaskTitle} for "${parent.title}".`,
        status,
        priority,
        labels: [label],
        parentTask: parent._id,
        project: parent.project,
        team: parent.team,
        private: parent.private,
        assignees,
        reporter: parent.reporter,
        watchers: [...new Set([...assignees, parent.reporter])],
        user: targetUser._id,
        startDate,
        dueDate: dueDate.getTime() > startDate.getTime() ? dueDate : new Date(startDate.getTime() + DAY),
        createdAt: startDate,
        updatedAt: startDate,
        comments: [{ body: pick(COMMENT_LINES[status]), author: pick(assignees), createdAt: commentAt, updatedAt: commentAt }],
      });
    }
  }
  const insertedSubtasks = subtaskDocs.length ? await Task.insertMany(subtaskDocs, { ordered: false }) : [];
  console.log(`Created ${insertedSubtasks.length} subtasks (across ${insertedTasks.length} parent tasks).`);

  // --- Activity log: one "created" entry per task/subtask ------------
  const allCreated = [...insertedTasks, ...insertedSubtasks];
  const activityDocs = allCreated.map((t) => ({
    actor: t.reporter,
    entityType: "task",
    entityId: t._id,
    team: t.team,
    action: "created",
    details: { title: t.title },
    createdAt: t.createdAt,
    updatedAt: t.createdAt,
  }));
  await ActivityLog.insertMany(activityDocs, { ordered: false });
  console.log(`Logged ${activityDocs.length} "created" activity entries.`);

  const counts = await Task.aggregate([
    { $match: { user: targetUser._id, parentTask: null } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  console.log("Column breakdown:", Object.fromEntries(counts.map((c) => [c._id, c.count])));

  // Every task needs dates/description/labels/comments filled regardless of
  // scope. Project only needs to be filled when the task actually has a team
  // (personal tasks are correctly team:null + project:null, not "incomplete").
  const incomplete = await Task.countDocuments({
    user: targetUser._id,
    $or: [
      { startDate: null }, { dueDate: null }, { description: "" }, { labels: { $size: 0 } }, { "comments.0": { $exists: false } },
      { $and: [{ team: { $ne: null } }, { project: null }] },
    ],
  });
  const personalCount = await Task.countDocuments({ user: targetUser._id, parentTask: null, team: null });
  console.log(`Personal tasks: ${personalCount}.`);
  console.log(incomplete === 0 ? "All tasks and subtasks have every field filled." : `WARNING: ${incomplete} task(s) still have a blank field.`);

  await mongoose.disconnect();
  console.log("Done.");
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
