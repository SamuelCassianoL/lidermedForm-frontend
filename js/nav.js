const body = document.querySelector("body"),
      leftbar = body.querySelector(".leftbar"),
      toggle = body.querySelector(".toggle"),
      modeSwitch = body.querySelector(".toggle-switch"),
      modeText = body.querySelector(".mode-text");

toggle.addEventListener("click", () => {
      leftbar.classList.toggle("close");
}
);
