let gameMode = "daily"; // Default mode: "practice" or "daily"
let notes = [];
let targetMelody = [];
let currentGuess = new Array(6).fill(0);
let attempts = 5;
let playsRemaining = 2;
let correctButtons = new Set();
let isPlaying = false;
let pTime = 700; // Ensure each sound is played for 800ms
let guessHistory = [];
let gameWon = false;

function preload() {
  for (let i = 0; i < 12; i++) {
    notes[i] = loadSound(`n${i + 30}.mp3`);
  }
}

function setup() {
  noCanvas();
  noLoop();
  //DOM
  // Create the test keyboard
  const keyboardDiv = document.getElementById("test-keyboard");
  const keyboardRow = document.createElement("div");
  keyboardRow.className = "note-row keyboard-row";

  for (let col = 0; col < 12; col++) {
    const button = document.createElement("button");
    button.className = "note-button test-button";

    button.addEventListener("click", () => {
      const note = notes[col];
      if (note.isLoaded()) {
        stopAllSounds();
        note.play();
        button.classList.add("playing");

        setTimeout(() => {
          button.classList.remove("playing");
          note.stop();
        }, pTime);
      } else {
        console.error(`Note ${col} is not loaded`);
      }
    });

    button.addEventListener("touchstart", (e) => {
      e.preventDefault(); // Prevent double-firing on mobile
      const note = notes[col];
      if (note.isLoaded()) {
        stopAllSounds();
        note.play();
        button.classList.add("playing");

        setTimeout(() => {
          button.classList.remove("playing");
          note.stop();
        }, pTime);
      } else {
        console.error(`Note ${col} is not loaded`);
      }
    });

    keyboardRow.appendChild(button);
  }
  keyboardDiv.appendChild(keyboardRow);
  if (gameMode === "practice") {
    targetMelody = [floor(random(12))];

    // Generate remaining 5 notes within ±4 steps of previous note
    for (let i = 1; i < 6; i++) {
      let prevNote = targetMelody[i - 1];
      let minNote = Math.max(0, prevNote - 12);
      let maxNote = Math.min(11, prevNote + 12);
      targetMelody.push(floor(random(minNote, maxNote + 1)));
    }
  } else {
    targetMelody = generateDailyMelody();
  }
  // Generate first note randomly

  // Create main game grid
  const gridDiv = document.getElementById("note-grid");
  for (let row = 0; row < 6; row++) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "note-row";

    for (let col = 0; col < 12; col++) {
      const button = document.createElement("button");
      button.className = "note-button";
      button.id = `button-${row}-${col}`;
      // Add touch event handler alongside click handler
      button.addEventListener("touchstart", (e) => {
        e.preventDefault(); // Prevent hover state and double-firing
        if (!correctButtons.has(row) && !isPlaying) {
          // Deselect all buttons in this row
          for (let i = 0; i < 12; i++) {
            document
              .getElementById(`button-${row}-${i}`)
              .classList.remove("selected");
          }
          // Select this button
          button.classList.add("selected");
          currentGuess[row] = col;
        }
      });

      button.addEventListener("click", () => {
        if (!correctButtons.has(row) && !isPlaying) {
          // Deselect all buttons in this row
          for (let i = 0; i < 12; i++) {
            document
              .getElementById(`button-${row}-${i}`)
              .classList.remove("selected");
          }
          // Select this button
          button.classList.add("selected");
          currentGuess[row] = col;
        }
      });

      rowDiv.appendChild(button);
    }
    gridDiv.appendChild(rowDiv);
  }

  document.getElementById("playTarget").addEventListener("click", () => {
    if (!isPlaying && playsRemaining > 0) {
      playMelody(targetMelody, false);
      playsRemaining--;
      updatePlaysRemaining();
    }
  });

  document.getElementById("submit").addEventListener("click", () => {
    if (!isPlaying) {
      checkGuess();
    }
  });

  document.getElementById("newGame").addEventListener("click", resetGame);

  document.getElementById("closeModalButton").addEventListener("click", () => {
    closeModal();
  });

  document
    .getElementById("copyToClipboardButton")
    .addEventListener("click", () => {
      const shareText = document.getElementById("modalShareText").textContent;
      navigator.clipboard
        .writeText(shareText)
        // Optional: add a small visual feedback instead of alert
        .then(() => {
          const copyButton = document.getElementById("copyToClipboardButton");
          const originalText = copyButton.textContent;
          copyButton.textContent = "Copied!";
          setTimeout(() => {
            copyButton.textContent = originalText;
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy text:", err);
        });
    });
  document.addEventListener(
    "touchstart",
    function () {
      if (getAudioContext().state !== "running") {
        getAudioContext().resume();
      }
    },
    { once: true }
  );
  document.addEventListener("DOMContentLoaded", setupModalListeners);
  const shareButton = document.getElementById("shareButton");
  const modal = document.getElementById("gameResultModal");
  const closeModalButton = document.getElementById("closeModalButton");
  const copyToClipboardButton = document.getElementById(
    "copyToClipboardButton"
  );
  const modalShareText = document.getElementById("modalShareText");
  shareButton.addEventListener("click", () => {
    // Set the shareable text
    const shareableText = generateShareText(); // Your custom function for shareable content
    modalShareText.textContent = shareableText;

    // Display the modal
    modal.style.display = "block";
  });

  // Close the modal when "Close" is clicked
  closeModalButton.addEventListener("click", () => {
    modal.style.display = "none";
  });
  // Close the Stats modal
  document
    .getElementById("closeStatsModalButton")
    .addEventListener("click", () => {
      document.getElementById("statsModal").style.display = "none";
    });

  // Ensure stats button is initialized on page load
  initializeStatsButton();

  if (gameMode === "daily") {
    const dailyState = getDailyState();
    if (
      dailyState &&
      dailyState.targetMelody.toString() === targetMelody.toString()
    ) {
      // Restore the completed daily game state
      gameWon = dailyState.gameWon;
      attempts = dailyState.attempts;
      guessHistory = [];
      targetMelody = dailyState.targetMelody;
      // Disable game controls
      document.getElementById("submit").disabled = true;
      document.getElementById("playTarget").disabled = true;
      // Show completion message
      document.getElementById("message").textContent = dailyState.gameWon
        ? `You won! 🎉 Solved in ${5 - dailyState.attempts} attempts!`
        : "Game Over! Try again tomorrow!";
      targetMelody.forEach((note, rowIndex) => {
        const button = document.getElementById(`button-${rowIndex}-${note}`);
        button.classList.add("correct");
      });
      return; // Exit setup early as game is already completed
    }
  }
}

//
//   if (gameMode === "daily") {
//     const dailyState = getDailyState();
//     if (dailyState) {
//       // Restore the completed daily game state
//       gameWon = dailyState.gameWon;
//       attempts = dailyState.attempts;
//       guessHistory = [];
//       targetMelody = dailyState.targetMelody;
//
//       // Disable game controls
//       document.getElementById("submit").disabled = true;
//       document.getElementById("playTarget").disabled = true;
//
//       // Show completion message
//       document.getElementById("message").textContent = dailyState.gameWon
//         ? `You won! 🎉 Solved in ${5 - dailyState.attempts} attempts!`
//         : "Game Over! Try again tomorrow!";
//       targetMelody.forEach((note, rowIndex) => {
//         const button = document.getElementById(`button-${rowIndex}-${note}`);
//         button.classList.add("correct");
//       });
//
//       return; // Exit setup early as game is already completed
//     }
//   }

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateDailyMelody() {
  // Create a seed based on the date (YYYYMMDD format)
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  // Use the seed to generate melody notes
  const melody = [];
  let prevNote = Math.floor(seededRandom(seed) * 12);
  melody.push(prevNote);

  for (let i = 1; i < 6; i++) {
    let randomVal = seededRandom(seed + i); // Ensure different randomness for each note
    let minNote = Math.max(0, prevNote - 4);
    let maxNote = Math.min(11, prevNote + 4);
    let nextNote = Math.floor(randomVal * (maxNote - minNote + 1)) + minNote;
    melody.push(nextNote);
    prevNote = nextNote;
  }
  console.log(melody);
  return melody;
}
function getDailyState() {
  const today = new Date().toISOString().split("T")[0];
  const dailyState = localStorage.getItem(`daily_state_${today}`);
  return dailyState ? JSON.parse(dailyState) : null;
}

function saveDailyState() {
  const today = new Date().toISOString().split("T")[0];
  const shareText = generateShareText();
  const state = {
    gameWon,
    attempts,
    guessHistory,
    targetMelody,
    completed: true,
    shareText,
  };
  localStorage.setItem(`daily_state_${today}`, JSON.stringify(state));
}

function stopAllSounds() {
  // Resume context before stopping sounds
  if (getAudioContext().state === "suspended") {
    getAudioContext().resume();
  }

  notes.forEach((note) => {
    if (note && note.isLoaded() && note.isPlaying()) {
      note.stop();
    }
  });
  isPlaying = false;
}

function updatePlaysRemaining() {
  document.getElementById(
    "plays-remaining"
  ).textContent = `${playsRemaining} plays remaining`;
  document.getElementById("playTarget").disabled = playsRemaining === 0;
}

function playNote(index, rowIndex = -1, highlightRow = true) {
  // Resume audio context
  if (getAudioContext().state === "suspended") {
    getAudioContext().resume();
  }

  const note = notes[index];
  if (note.isLoaded()) {
    // Create a promise to handle note playing
    return new Promise((resolve) => {
      try {
        note.play();
      } catch (e) {
        console.error("Error playing note:", e);
        // Try to recover by resuming context and playing again
        getAudioContext()
          .resume()
          .then(() => {
            note.play();
          });
      }

      if (rowIndex >= 0 && highlightRow) {
        const button = document.getElementById(`button-${rowIndex}-${index}`);
        button.classList.add("playing");
        setTimeout(() => {
          button.classList.remove("playing");
        }, pTime);
      }

      // Wait for note to finish before resolving
      setTimeout(() => {
        note.stop();
        resolve();
      }, pTime);
    });
  } else {
    console.error(`Note ${index} is not loaded`);
    return Promise.resolve();
  }
}

function playMelody(melody, highlightNotes = true) {
  stopAllSounds();
  console.log(melody);
  isPlaying = true;
  document.getElementById("submit").disabled = true;
  document.getElementById("playTarget").disabled = true;
  document.getElementById("newGame").disabled = true;

  let lastHighlightedRow = -1;

  // Play notes sequentially using async/await
  async function playSequence() {
    for (let i = 0; i < melody.length; i++) {
      const noteIndex = melody[i];
      // console.log(`Playing note ${noteIndex} at position ${i}`);

      if (!highlightNotes) {
        if (lastHighlightedRow >= 0) {
          for (let col = 0; col < 12; col++) {
            const prevButton = document.getElementById(
              `button-${lastHighlightedRow}-${col}`
            );
            prevButton.style.border = "2px solid #714ab5";
          }
        }
        for (let col = 0; col < 12; col++) {
          const button = document.getElementById(`button-${i}-${col}`);
          button.style.border = "5px solid #eb5951";
        }
        lastHighlightedRow = i;
        await playNote(noteIndex);
      } else {
        await playNote(noteIndex, i, true);
      }

      // Add small buffer between notes
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Reset UI after sequence completes
    setTimeout(() => {
      isPlaying = false;
      document.getElementById("submit").disabled = false;
      if (playsRemaining > 0) {
        document.getElementById("playTarget").disabled = false;
      }
      document.getElementById("newGame").disabled = false;
      if (!highlightNotes && lastHighlightedRow >= 0) {
        for (let col = 0; col < 12; col++) {
          const button = document.getElementById(
            `button-${lastHighlightedRow}-${col}`
          );
          button.style.border = "2px solid #714ab5";
        }
      }
    }, 500);
  }

  playSequence();
}
function melodyToNumber(melody) {
  // Convert melody array to a base-12 number
  return melody.reduce((acc, note) => acc * 12 + note, 0);
}
function checkGuess() {
  if (attempts <= 0 || gameWon) return;

  playMelody(currentGuess, true);

  let allCorrect = true;
  currentGuess.forEach((note, index) => {
    if (note === targetMelody[index]) {
      correctButtons.add(index);
      for (let i = 0; i < 12; i++) {
        const button = document.getElementById(`button-${index}-${i}`);
        button.classList.remove("selected", "playing");
        if (i === note) {
          button.classList.add("correct");
        }
      }
    } else {
      allCorrect = false;
    }
  });

  guessHistory.push([...currentGuess]);
  attempts--;
  playsRemaining = 2;

  document.getElementById("attempts").textContent = `Attempts: ${attempts}`;
  updatePlaysRemaining();

  if (allCorrect) {
    handleGameWin();
    if (gameMode === "daily") {
      saveDailyState();
      updateStats(true, attempts);
      showShareModal();
    }
    document.getElementById("message").textContent = "You won! 🎉🎉🎉";
    document.getElementById("submit").disabled = true;
    document.getElementById("playTarget").disabled = true;
  } else if (attempts <= 0) {
    if (gameMode === "daily") {
      saveDailyState();
      updateStats(false, 0);
    }
    document.getElementById("message").textContent = "Game Over!";
    document.getElementById("submit").disabled = true;
    document.getElementById("playTarget").disabled = true;
  }
}
function switchGameMode(mode) {
  gameMode = mode;
  document.querySelectorAll(".mode-toggle button").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.getElementById(`btn-${mode}`).classList.add("active");

  if (mode === "practice") {
    document.getElementById("newGame").classList.remove("hidden");
    resetGame();
  } else if (mode === "daily") {
    document.getElementById("newGame").classList.add("hidden");
    targetMelody = generateDailyMelody();
    // Check if daily has been completed
    const dailyState = getDailyState();
    if (
      dailyState &&
      dailyState.targetMelody.toString() === targetMelody.toString()
    ) {
      // If daily is completed, show stats and disable game
      gameWon = dailyState.gameWon;
      attempts = dailyState.attempts;
      guessHistory = dailyState.guessHistory;
      targetMelody = dailyState.targetMelody;
      // Disable game controls
      document.getElementById("submit").disabled = true;
      document.getElementById("message").textContent =
        "You've already completed today's melody!";
      // You could also add visual indicators here
      // Like changing button colors or showing a completion icon
    } else {
      // New daily game
      resetGame();
    }
  }
}
// Add event listeners for buttons
document.querySelectorAll(".mode-toggle button").forEach((button) => {
  button.addEventListener("click", () => {
    const selectedMode = button.dataset.mode;
    switchGameMode(selectedMode);
  });
});

function resetGame() {
  // Resume audio context first
  getAudioContext()
    .resume()
    .then(() => {
      gameWon = false;
      const shareButton = document.getElementById("shareButton");
      guessHistory = [];
      stopAllSounds();

      guessHistory = [];
      gameWon = false;
      attempts = 5;
      playsRemaining = 2;
      correctButtons = new Set(); // Added this line to reset the correctButtons state

      // Hide modal initially
      document.getElementById("gameResultModal").style.display = "none";

      if (gameMode === "practice") {
        // Generate random target melody for practice
        targetMelody = [floor(random(12))];
        for (let i = 1; i < 6; i++) {
          let prevNote = targetMelody[i - 1];
          let minNote = Math.max(0, prevNote - 4);
          let maxNote = Math.min(11, prevNote + 4);
          targetMelody.push(floor(random(minNote, maxNote + 1)));
        }
      } else if (gameMode === "daily") {
        generateDailyMelody();
      }

      // Reset UI
      document.getElementById("attempts").textContent = "Attempts: 5";
      document.getElementById("message").textContent = "";
      document.getElementById("plays-remaining").textContent =
        "2 plays remaining";
      document.getElementById("submit").disabled = false;
      document.getElementById("playTarget").disabled = false;

      // Reset all buttons
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 12; col++) {
          const button = document.getElementById(`button-${row}-${col}`);
          button.className = "note-button";
          button.style.border = "2px solid #714ab5";
        }
      }

      // Log audio context state for debugging
      console.log("Audio context state after reset:", getAudioContext().state);
    });
}

function padNumber(num) {
  // 12^6 = 2,985,984 so we need 7 digits
  return num.toString().padStart(7, "0");
}
function generateShareText() {
  if (!targetMelody || targetMelody.length !== 6) {
    return "Error: Melody not generated.";
  }
  let shareText = "www.melodEcho.com" + "\n\n";

  if (!gameWon) {
    // let shareText = "www.melodEcho.com" + "\n";
    console.log(shareText);
  } else {
    const melodyNum = melodyToNumber(targetMelody);
    shareText += `MelodEcho #${padNumber(melodyNum)}\n\n`;

    if (gameMode === "daily") {
      shareText += "MelodEcho Daily Challenge\n\n";
    }

    guessHistory.forEach((guess) => {
      const rowText = guess
        .map((note, colIndex) =>
          note === targetMelody[colIndex] ? "🟩" : "⬛"
        )
        .join("");
      shareText += rowText + "\n";
    });

    const attemptsUsed = 5 - attempts;
    shareText += `\nSolved in ${attemptsUsed} attempts!\n`;
    shareText += `The melody was: ${targetMelody.join(",")}\n`;
    // shareText += "www.melodEcho.com";
  }
  return shareText;
}

function showStatsModal() {
  const stats = getStats();
  const modal = document.getElementById("statsModal");
  const statsContent = document.getElementById("statsContent");

  const winPercentage =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  // Find the maximum value in guess distribution for scaling
  const maxGuesses = Math.max(...Object.values(stats.guessDistribution));

  statsContent.innerHTML = `
		<div class="stats-grid">
			<div class="stat-box">
				<span class="stat-number">${stats.gamesPlayed}</span>
				<span class="stat-label">Played</span>
			</div>
			<div class="stat-box">
				<span class="stat-number">${winPercentage}</span>
				<span class="stat-label">Win %</span>
			</div>
			<div class="stat-box">
				<span class="stat-number">${stats.currentStreak}</span>
				<span class="stat-label">Current Streak</span>
			</div>
			<div class="stat-box">
				<span class="stat-number">${stats.maxStreak}</span>
				<span class="stat-label">Max Streak</span>
			</div>
		</div>
		
		<h3>Guess Distribution</h3>
		<div class="guess-distribution">
			${Object.entries(stats.guessDistribution)
        .map(
          ([guess, count]) => `
				<div class="guess-row">
					<span class="guess-label">${guess}</span>
					<div class="guess-bar-container">
						<div class="guess-bar" style="width: ${
              maxGuesses > 0 ? (count / maxGuesses) * 100 : 0
            }%">
							<span class="guess-count">${count}</span>
						</div>
					</div>
				</div>
			`
        )
        .join("")}
		</div>
	`;

  modal.style.display = "block";
}

function saveStatsForToday() {
  const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
  const statsKey = `daily_stats_${today}`;
  const stats = {
    attempts: 5 - attempts, // Number of attempts used
    playsRemaining,
    gameWon,
    guessHistory,
  };
  localStorage.setItem(statsKey, JSON.stringify(stats));
}

function loadStatsForToday() {
  const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
  const statsKey = `daily_stats_${today}`;
  const stats = JSON.parse(localStorage.getItem(statsKey));
  return stats || {}; // Return an empty object if no stats are found
}

// When the game is over, the modal will not automatically pop up
function showGameOverOptions() {
  if (!gameWon && attempts > 0) return; // Prevent modal if game is still active

  const message = gameWon
    ? "You won! 🎉 Solved in " + (5 - attempts) + " attempts!"
    : "Game Over! Better luck next time.";

  // document.getElementById("modalMessage").textContent = message;
  // document.getElementById("gameResultModal").style.display = "block";
}

// Function to close the modal
function closeModal() {
  document.getElementById("gameResultModal").style.display = "none";
}

// Function to generate the stats text (e.g., for viewing)
function generateStatsText(stats) {
  const attemptsUsed = 5 - stats.attempts;
  const message = stats.gameWon ? "You won! 🎉" : "Game Over!";
  return `${message}\nSolved in ${attemptsUsed} attempts!\nPlays remaining: ${stats.playsRemaining}`;
}

// Handle the Share button visibility when the game is won
function handleGameWin() {
  gameWon = true;
  const shareButton = document.getElementById("shareButton");
  shareButton.style.display = "block";

  // Remove any existing listeners to prevent duplicates
  shareButton.replaceWith(shareButton.cloneNode(true));

  // Get the fresh reference and add listener
  document.getElementById("shareButton").addEventListener("click", () => {
    const modal = document.getElementById("gameResultModal");
    const dailyState = getDailyState();
    const shareText = dailyState ? dailyState.shareText : generateShareText();
    document.getElementById("modalShareText").textContent = shareText;
    modal.style.display = "flex";
  });
}

// Show the Share modal
function showShareModal() {
  if (!gameWon) return;

  const modal = document.getElementById("gameResultModal");
  const dailyState = getDailyState();
  const shareText = dailyState ? dailyState.shareText : generateShareText();

  document.getElementById("modalShareText").textContent = shareText;
  modal.style.display = "flex";
  document.getElementById("submit").disabled = true;
}

// Update event listeners
function setupModalListeners() {
  // Copy button listener
  const copyButton = document.getElementById("copyToClipboardButton");
  if (copyButton) {
    copyButton.addEventListener("click", () => {
      const shareText = generateShareText();
      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          alert("Results copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy text:", err);
          alert("Failed to copy to clipboard");
        });
    });
  }

  // Close button listener
  const closeButton = document.getElementById("closeModalButton");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      document.getElementById("gameResultModal").style.display = "none";
    });
  }

  // Click outside to close
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("gameResultModal");
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
}

// Handle the Stats button visibility
function initializeStatsButton() {
  const statsButton = document.getElementById("statsButton");
  statsButton.style.display = "block";
  statsButton.addEventListener("click", showStatsModal);
}

function getStats() {
  const stats = localStorage.getItem("melodecho_stats");
  if (!stats) {
    // Initialize stats object if none exists
    const defaultStats = {
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      lastPlayedDate: null,
      guessDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
    localStorage.setItem("melodecho_stats", JSON.stringify(defaultStats));
    return defaultStats;
  }
  return JSON.parse(stats);
}

function updateStats(won, attempts) {
  const stats = getStats();
  const today = new Date().toISOString().split("T")[0];

  // Update streak
  if (stats.lastPlayedDate) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split("T")[0];

    if (won && stats.lastPlayedDate === yesterdayString) {
      stats.currentStreak++;
    } else if (won) {
      stats.currentStreak = 1;
    } else {
      stats.currentStreak = 0;
    }
  } else if (won) {
    stats.currentStreak = 1;
  }

  // Update max streak
  stats.maxStreak = Math.max(stats.currentStreak, stats.maxStreak);

  // Update general stats
  stats.gamesPlayed++;
  if (won) {
    stats.gamesWon++;
    // Fix: Use the actual number of attempts used (5 - remaining attempts)
    const attemptsUsed = 5 - attempts;
    stats.guessDistribution[attemptsUsed]++;
  }

  stats.lastPlayedDate = today;

  localStorage.setItem("melodecho_stats", JSON.stringify(stats));
}
