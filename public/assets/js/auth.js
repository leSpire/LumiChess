const $ = (sel, root = document) => root.querySelector(sel);

const STORE_KEY = "lumichess-users-v1";
const SESSION_KEY = "lumichess-session-v1";

function readUsers() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(STORE_KEY, JSON.stringify(users));
}
function setCurrentUser(email) {
  if (!email) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, email);
}
function seedHistory() {
  return [
    { date: "Semaine 1", elo: 1180, accuracy: 67, focus: "ouvertures" },
    { date: "Semaine 2", elo: 1215, accuracy: 71, focus: "tactiques" },
    { date: "Semaine 3", elo: 1242, accuracy: 74, focus: "finales" },
    { date: "Semaine 4", elo: 1270, accuracy: 78, focus: "stratégie" },
  ];
}
function ensureProfile(user) {
  user.profile ??= { theme: "", weakness: "", bio: "" };
  user.history ??= seedHistory();
  user.goals ??= [{ text: "+100 Elo en 3 mois", deadline: "", done: false }];
  return user;
}
function goDashboard() {
  window.location.href = "index.html";
}

const authForm = $("#authForm");
const registerBtn = $("#registerBtn");
const guestBtn = $("#guestBtn");
const authStatus = $("#authStatus");

authForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPassword").value;

  const users = readUsers();
  const found = users.find((u) => u.email === email);
  if (!found || found.password !== password) {
    authStatus.textContent = "Connexion refusée. Vérifiez vos identifiants.";
    return;
  }

  setCurrentUser(email);
  authStatus.textContent = `Bienvenue ${found.pseudo} 👑`;
  setTimeout(goDashboard, 250);
});

registerBtn?.addEventListener("click", () => {
  const pseudo = $("#authPseudo").value.trim();
  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPassword").value;

  if (!pseudo || !email || password.length < 6) {
    authStatus.textContent = "Inscription: remplissez tous les champs (mot de passe ≥ 6).";
    return;
  }

  const users = readUsers();
  if (users.some((u) => u.email === email)) {
    authStatus.textContent = "Cet email existe déjà.";
    return;
  }

  users.push(ensureProfile({ pseudo, email, password }));
  saveUsers(users);
  setCurrentUser(email);
  authStatus.textContent = "Inscription validée, vous êtes connecté.";
  setTimeout(goDashboard, 250);
});

guestBtn?.addEventListener("click", () => {
  const stamp = Date.now();
  const email = `invite-${stamp}@guest.local`;
  const pseudo = `Invité ${String(stamp).slice(-4)}`;
  const users = readUsers();
  users.push(ensureProfile({
    pseudo,
    email,
    password: "guest-mode",
    isGuest: true,
  }));
  saveUsers(users);
  setCurrentUser(email);
  authStatus.textContent = "Mode invité activé. Bonne partie !";
  setTimeout(goDashboard, 250);
});
