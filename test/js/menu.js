const menuBtn = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");
const menuLogout = document.getElementById("menuLogout");
function updateMenuVisibility() {
  if (currentUser && window.ownProfile?.nickname) {
    menuBtn.classList.remove("hidden");
  } else {
    menuBtn.classList.add("hidden");
    sideMenu.classList.add("hidden");
  }
}

function initMenu() {

  // menü gomb
  menuBtn.onclick = () => {
    sideMenu.classList.toggle("hidden");
  };

  // kilépés gomb
  menuLogout.onclick = () => {
    signOut();
  };

  // kívül kattintás bezárja
  document.addEventListener("click", (e) => {
    if (!sideMenu.contains(e.target) && e.target !== menuBtn) {
      sideMenu.classList.add("hidden");
    }
  });
}


// LOGIN STATE HOOK
function updateMenuVisibility() {
  if (currentUser) {
    menuBtn.classList.remove("hidden");
  } else {
    menuBtn.classList.add("hidden");
    sideMenu.classList.add("hidden");
  }
}