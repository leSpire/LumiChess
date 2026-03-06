const $ = (sel, root = document) => root.querySelector(sel);

const STORE_KEY = "lumichess-users-v1";
const SESSION_KEY = "lumichess-session-v1";
const LAST_AUTH_KEY = "lumichess-last-auth-v1";

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
function saveLastAuth(payload) {
  localStorage.setItem(LAST_AUTH_KEY, JSON.stringify(payload));
}
function readLastAuth() {
  try { return JSON.parse(localStorage.getItem(LAST_AUTH_KEY) || "null"); }
  catch { return null; }
}
function isValidPseudo(pseudo) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(pseudo);
}
function isValidPassword(password) {
  return typeof password === "string" && password.length >= 6;
}
function findUser(users, pseudo, email) {
  const normalizedPseudo = pseudo.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  return users.find((u) => {
    const byPseudo = normalizedPseudo && u.pseudo.toLowerCase() === normalizedPseudo;
    const byEmail = normalizedEmail && u.email === normalizedEmail;
    return byPseudo || byEmail;
  });
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
const pseudoInput = $("#authPseudo");
const emailInput = $("#authEmail");
const passwordInput = $("#authPassword");

(() => {
  const lastAuth = readLastAuth();
  if (!lastAuth) return;
  if (pseudoInput && lastAuth.pseudo) pseudoInput.value = lastAuth.pseudo;
  if (emailInput && lastAuth.email) emailInput.value = lastAuth.email;
  if (passwordInput && lastAuth.password) passwordInput.value = lastAuth.password;
})();

authForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const pseudo = pseudoInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!pseudo && !email) {
    authStatus.textContent = "Saisissez un pseudo ou un email pour vous connecter.";
    return;
  }
  if (!isValidPassword(password)) {
    authStatus.textContent = "Mot de passe invalide (minimum 6 caractères).";
    return;
  }

  const users = readUsers();
  const found = findUser(users, pseudo, email);
  if (!found || found.password !== password) {
    authStatus.textContent = "Connexion refusée. Vérifiez vos identifiants.";
    return;
  }

  setCurrentUser(found.email);
  saveLastAuth({ pseudo: found.pseudo, email: found.email, password: found.password });
  authStatus.textContent = `Bienvenue ${found.pseudo} 👑`;
  setTimeout(goDashboard, 250);
});

registerBtn?.addEventListener("click", () => {
  const pseudo = pseudoInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!isValidPseudo(pseudo) || !email || !isValidPassword(password)) {
    authStatus.textContent = "Inscription: pseudo valide (3-20, lettres/chiffres/_/-), email et mot de passe ≥ 6 requis.";
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
  saveLastAuth({ pseudo, email, password });
  authStatus.textContent = "Inscription validée, vous êtes connecté.";
  setTimeout(goDashboard, 250);
});

guestBtn?.addEventListener("click", () => {
  const users = readUsers();
  let pseudo = "";
  let email = "";
  do {
    const random = Math.floor(100 + Math.random() * 9900);
    pseudo = `guest${random}`;
    email = `${pseudo}@guest.local`;
  } while (users.some((u) => u.email === email || u.pseudo.toLowerCase() === pseudo));

  users.push(ensureProfile({
    pseudo,
    email,
    password: "guest-mode",
    isGuest: true,
  }));
  saveUsers(users);
  setCurrentUser(email);
  saveLastAuth({ pseudo, email, password: "guest-mode" });
  authStatus.textContent = "Mode invité activé. Bonne partie !";
  setTimeout(goDashboard, 250);
});
