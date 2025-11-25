document.addEventListener("DOMContentLoaded", () => {
  const clubSelect = document.getElementById("jsw-club-select");
  if (!clubSelect) return;

  // Charger club par défaut
  const savedClub = localStorage.getItem("jsw_club") || "fer7";
  clubSelect.value = savedClub;

  // Applique automatiquement au JustSwing Clean
  if (window.JustSwing?.setClubType) {
    JustSwing.setClubType(savedClub);
  }

  // Lors d'un changement
  clubSelect.addEventListener("change", () => {
    const club = clubSelect.value;

    // Mémorisation
    localStorage.setItem("jsw_club", club);

    // Applique au module clean
    if (window.JustSwing?.setClubType) {
      JustSwing.setClubType(club);
    }

    console.log("🏌️ Club sélectionné :", club);
  });
});
