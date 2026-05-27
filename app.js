const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

const quoteForm = document.querySelector("#quoteForm");
const lawnSize = document.querySelector("#lawnSize");
const frequency = document.querySelector("#frequency");
const quoteTotal = document.querySelector("#quoteTotal");
const quoteSummary = document.querySelector("#quoteSummary");
const bookingNotes = document.querySelector("#bookingNotes");

function updateQuote() {
  const base = Number(lawnSize.value);
  const extras = [...quoteForm.querySelectorAll("input[type='checkbox']:checked")];
  const extrasTotal = extras.reduce((sum, item) => sum + Number(item.value), 0);
  const multiplier = Number(frequency.value);
  const total = Math.round((base + extrasTotal) * multiplier);
  const selectedExtras = extras.map((item) => item.dataset.label).join(", ");
  const frequencyText = frequency.options[frequency.selectedIndex].text.replace(/ - .*/, "");

  quoteTotal.textContent = money.format(total);
  quoteSummary.textContent = `${lawnSize.options[lawnSize.selectedIndex].text.split(" - ")[0]}, ${frequencyText}${
    selectedExtras ? `, plus ${selectedExtras}` : ""
  } - estimate only`;
}

quoteForm.addEventListener("input", updateQuote);
updateQuote();

document.querySelectorAll(".select-plan").forEach((button) => {
  button.addEventListener("click", () => {
    const plan = button.dataset.plan;
    const price = money.format(Number(button.dataset.price));
    bookingNotes.value = `${plan} selected (${price} estimate). Exact price confirmed after looking at the property.`;
    document.querySelector("#booking").scrollIntoView({ behavior: "smooth" });
    document.querySelector("#bookingStatus").textContent = `${plan} selected. Choose a date and send your booking details.`;
  });
});

const calendarGrid = document.querySelector("#calendarGrid");
const calendarTitle = document.querySelector("#calendarTitle");
const selectedDate = document.querySelector("#selectedDate");
const selectedTime = document.querySelector("#selectedTime");
const today = new Date();
today.setHours(0, 0, 0, 0);
let visibleMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let activeDate = null;

function toInputDate(date) {
  return date.toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  calendarTitle.textContent = visibleMonth.toLocaleDateString("en-NZ", {
    month: "long",
    year: "numeric",
  });

  const month = visibleMonth.getMonth();
  const year = visibleMonth.getFullYear();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < mondayOffset; i += 1) {
    calendarGrid.append(document.createElement("span"));
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;
    button.disabled = date < today || date.getDay() === 0;
    button.setAttribute("aria-label", toInputDate(date));

    if (activeDate && date.toDateString() === activeDate.toDateString()) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      activeDate = date;
      selectedDate.value = toInputDate(date);
      renderCalendar();
    });

    calendarGrid.append(button);
  }
}

document.querySelector("#prevMonth").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector("#nextMonth").addEventListener("click", () => {
  visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  renderCalendar();
});

renderCalendar();

document.querySelector("#bookingForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const status = document.querySelector("#bookingStatus");

  if (!selectedDate.value) {
    status.textContent = "Please choose a booking date first.";
    selectedDate.focus();
    return;
  }

  status.textContent = `Booking saved for ${selectedDate.value} at ${selectedTime.value}. Price shown is an estimate only. Exact price is confirmed after looking at the property.`;
});
