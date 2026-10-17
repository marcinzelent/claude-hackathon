// "Upload your CV / LinkedIn PDF" widget. Self-contained, like diy.js.
//
// Add to index.html (Frontend owner):
//   <section id="cv-import" data-profile-target="#my-profile" data-goal-target="#goal"></section>
//   <script src="cv_upload.js" defer></script>
//
// data-profile-target / data-goal-target are CSS selectors for the profile
// textarea and the goal input. The goal is only filled in when it is empty.
// It also fires a "cv-imported" event on document with the server's JSON.

(function () {
  const root = document.getElementById("cv-import");
  if (!root) return;

  root.innerHTML = `
    <label class="cv-upload">
      <span class="cv-upload-button">Upload CV or LinkedIn PDF</span>
      <input type="file" accept="application/pdf,.pdf" hidden>
    </label>
    <p class="cv-hint">On LinkedIn (desktop): your profile, then <b>Resources</b> (or <b>More</b>), then <b>Save to PDF</b>.</p>
    <p class="cv-status" role="status" aria-live="polite"></p>`;

  const input = root.querySelector("input");
  const button = root.querySelector(".cv-upload-button");
  const status = root.querySelector(".cv-status");

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    button.textContent = "Claude is reading your CV…";
    status.textContent = "";
    root.classList.add("loading");
    try {
      const res = await fetch("/api/profile_from_cv", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || "Couldn't read that file.");

      const profileEl = document.querySelector(root.dataset.profileTarget || "#my-profile");
      const goalEl = document.querySelector(root.dataset.goalTarget || "#goal");
      if (profileEl) profileEl.value = data.profile;
      if (goalEl && !goalEl.value.trim()) goalEl.value = data.suggested_goal;
      status.textContent = data.tip ? `Done. Tip: ${data.tip}` : "Done. Check the text and edit anything that's off.";
      document.dispatchEvent(new CustomEvent("cv-imported", { detail: data }));
    } catch (err) {
      status.textContent = err.message;
    } finally {
      button.textContent = "Upload CV or LinkedIn PDF";
      root.classList.remove("loading");
      input.value = "";
    }
  });
})();
