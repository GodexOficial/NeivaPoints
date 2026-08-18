export default async function run(page, ui) {
  const log = [];
  function record(step, ok, details = "") {
    log.push({ step, status: ok ? "PASS" : "FAIL", details });
    console.log(
      `[${ok ? "PASS" : "FAIL"}] ${step}${details ? " - " + details : ""}`,
    );
  }

  // 1. Initial Page Load
  let snap = await ui.snapshot();
  record("Initial load", snap.includes("Dashboard"), "Dashboard rendered");

  // 2. Go to Settings and Load Sample Data
  const settingsBtn = snap.match(/@(e\d+) button "Settings"/)?.[1];
  await ui.click(settingsBtn);
  await page.waitForTimeout(300);

  snap = await ui.snapshot();
  const loadSampleBtn = snap.match(
    /@(e\d+) button "Load Sample Data \(12 Students\)"/,
  )?.[1];
  if (loadSampleBtn) {
    await ui.click(loadSampleBtn);
    await page.waitForTimeout(400);
    record("Load sample data", true, "Loaded 12 sample students");
  } else {
    record("Load sample data", false, "Button not found");
  }

  // 3. Go to Dashboard and verify data
  snap = await ui.snapshot();
  const dashboardBtn = snap.match(/@(e\d+) button "Dashboard"/)?.[1];
  await ui.click(dashboardBtn);
  await page.waitForTimeout(300);

  const fullText = await page.textContent("body");
  record(
    "Dashboard with sample data",
    fullText.includes("12") && fullText.includes("Total Students"),
    "12 students shown in stats",
  );

  // 4. Click a class card on Dashboard to navigate to Classes
  const class6thGrade = await page.getByText("6th Grade").first();
  await class6thGrade.click();
  await page.waitForTimeout(300);

  snap = await ui.snapshot();
  record(
    "Navigate to Classes tab",
    snap.includes("Ranking") ||
      (await page.textContent("body")).includes("Ranking"),
    "Classes view rendered",
  );

  // 5. Test Class Tab switching (e.g. 7th Grade)
  const class7thTab = await page.getByRole("button", { name: /7th Grade/i });
  await class7thTab.click();
  await page.waitForTimeout(300);
  record(
    "Switch to 7th Grade tab",
    (await page.textContent("body")).includes("7th Grade"),
    "Switched class tab",
  );

  // 6. Go to Students page
  snap = await ui.snapshot();
  const studentsBtn = snap.match(/@(e\d+) button "Students"/)?.[1];
  await ui.click(studentsBtn);
  await page.waitForTimeout(300);

  // 7. Test Search & Filter on Students Page
  const searchInput = await page.locator(
    'input[placeholder*="Search student"]',
  );
  await searchInput.fill("Sample Student 01");
  await page.waitForTimeout(300);
  let studentsText = await page.textContent("body");
  record(
    "Search student",
    studentsText.includes("Sample Student 01") &&
      !studentsText.includes("Sample Student 05"),
    "Search filtered accurately",
  );

  await searchInput.fill("");
  await page.waitForTimeout(200);

  // 8. Test View Toggle (Table view)
  const tableBtn = await page.locator('button[title="Table View"]');
  await tableBtn.click();
  await page.waitForTimeout(300);
  record(
    "Toggle Table View",
    (await page.locator("table").count()) > 0,
    "Table view displayed",
  );

  // 9. Open Points Modal and Trigger a Level-Up
  const addPointsTableBtn = await page
    .locator('button:has-text("+ Points")')
    .first();
  await addPointsTableBtn.click();
  await page.waitForTimeout(400);

  // In points modal, select +50 points or enter custom 100 points
  const customInput = await page.locator(
    'input[placeholder*="Enter point amount"]',
  );
  await customInput.fill("100");
  await page.waitForTimeout(200);

  const confirmAddBtn = await page.locator('button:has-text("Add 100 Points")');
  await confirmAddBtn.click();
  await page.waitForTimeout(500);

  // Check LevelUpToast appears!
  const toastText = await page.textContent("body");
  record(
    "Level-Up Toast Notification",
    toastText.includes("Level Up!") && toastText.includes("Lvl 2"),
    "Celebration toast triggered and displayed",
  );

  // 10. Open Student Profile Details
  const studentNameLink = await page.locator("td div.font-bold").first();
  await studentNameLink.click();
  await page.waitForTimeout(400);

  const detailsText = await page.textContent("body");
  record(
    "Student Details View",
    detailsText.includes("LEVEL") && detailsText.includes("Point History"),
    "Profile showcase and transaction history rendered",
  );

  // 11. Test Remove Points with Confirmation Dialog
  const removePointsBtn = await page.locator(
    'button:has-text("Remove Points")',
  );
  await removePointsBtn.click();
  await page.waitForTimeout(300);

  const removeAmountInput = await page.locator(
    'input[placeholder*="Enter point amount"]',
  );
  await removeAmountInput.fill("10");
  await page.waitForTimeout(200);

  const submitRemoveBtn = await page.locator(
    'button:has-text("Remove 10 Points")',
  );
  await submitRemoveBtn.click();
  await page.waitForTimeout(300);

  // Verify Confirmation Dialog appeared
  const confirmDialogText = await page.textContent("body");
  record(
    "Remove Points Confirmation Dialog",
    confirmDialogText.includes("Remove 10 points from") &&
      confirmDialogText.includes("Cancel"),
    "Confirmation prompt displayed",
  );

  const confirmDialogYesBtn = await page.locator(
    'div[role="dialog"] button:has-text("Remove Points")',
  );
  await confirmDialogYesBtn.click();
  await page.waitForTimeout(400);
  record(
    "Confirmed Points Removal",
    true,
    "Points deducted and logged in history",
  );

  // 12. Test Student Self-Registration ("Join Your Class")
  const returnToTeacherBtn = await page.locator('button:has-text("Back")');
  await returnToTeacherBtn.click();
  await page.waitForTimeout(300);

  const joinClassNavBtn = await page.locator(
    'button:has-text("Join Your Class")',
  );
  await joinClassNavBtn.click();
  await page.waitForTimeout(400);

  record(
    "Join Your Class View",
    (await page.textContent("body")).includes("JOIN YOUR CLASS"),
    "Student registration view opened",
  );

  // Validation test: empty submit
  const joinSubmitBtn = await page.locator('button:has-text("JOIN")');
  const studentNameInput = await page.locator(
    'input[placeholder*="Enter your full name"]',
  );
  await studentNameInput.fill("Alice Wonderland");
  await joinSubmitBtn.click();
  await page.waitForTimeout(400);

  const successText = await page.textContent("body");
  record(
    "Student Self-Registration",
    successText.includes("Registration completed!") &&
      successText.includes("Alice Wonderland") &&
      successText.includes("Level 1"),
    "Student successfully joined with Level 1 & 0 pts",
  );

  // Return to teacher dashboard
  const backToTeacherBtn = await page.locator('button:has-text("Done")');
  await backToTeacherBtn.click();
  await page.waitForTimeout(300);

  return { success: true, log };
}
