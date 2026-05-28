const form = document.querySelector("#authForm");
const message = document.querySelector("#authMessage");
const tabs = document.querySelectorAll(".auth-tab");
let mode = "login";

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    mode = tab.dataset.mode;
    tabs.forEach((item) => item.classList.toggle("active", item === tab));
    form.querySelector("button[type='submit']").textContent = mode === "login" ? "Einloggen" : "Account erstellen";
    message.textContent = "";
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";

  const response = await fetch(`/api/${mode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: document.querySelector("#email").value,
      password: document.querySelector("#password").value
    })
  });

  const data = await response.json();
  if (!response.ok) {
    message.textContent = data.error || "Bitte pruefe deine Eingaben.";
    return;
  }

  window.location.href = "/dashboard.html";
});
