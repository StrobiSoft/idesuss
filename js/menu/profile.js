export function openProfilePanel() {
  let panel = document.getElementById("profilePanel");

  if (!panel) {
    panel = document.createElement("section");
    panel.id = "profilePanel";
    panel.innerHTML = `
      <div class="profile-panel-card">
        <button id="closeProfilePanel" class="profile-panel-close" type="button">×</button>
        <h2>Profil</h2>
        <p>Itt lesznek a profil beállításai.</p>

        <div class="profile-placeholder">
          <strong>Avatar</strong>
          <span>Később: avatar választás / kép feltöltés</span>
        </div>

        <div class="profile-placeholder">
          <strong>Nicknév</strong>
          <span>Később: becenév megadása</span>
        </div>

        <div class="profile-placeholder">
          <strong>E-mail láthatóság</strong>
          <span>Később: kapcsoló</span>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    document
      .getElementById("closeProfilePanel")
      .addEventListener("click", () => {
        panel.classList.remove("show");
      });
  }

  panel.classList.add("show");
}