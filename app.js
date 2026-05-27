const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

const quoteForm = document.querySelector("#quoteForm");
const lawnArea = document.querySelector("#lawnArea");
const accessLevel = document.querySelector("#accessLevel");
const frequency = document.querySelector("#frequency");
const quoteTotal = document.querySelector("#quoteTotal");
const quoteSummary = document.querySelector("#quoteSummary");
const bookingNotes = document.querySelector("#bookingNotes");
const addressInput = document.querySelector("#addressInput");
const showMap = document.querySelector("#showMap");
const openMaps = document.querySelector("#openMaps");
const mapPreview = document.querySelector("#mapPreview");
const mapFrame = document.querySelector("#mapFrame");
const mapStatus = document.querySelector("#mapStatus");
const lawnPhoto = document.querySelector("#lawnPhoto");
const estimatorCanvas = document.querySelector("#estimatorCanvas");
const clearDrawing = document.querySelector("#clearDrawing");
const addSection = document.querySelector("#addSection");
const applyEstimate = document.querySelector("#applyEstimate");
const estimatorStatus = document.querySelector("#estimatorStatus");
const canvasWrap = document.querySelector(".canvas-wrap");
const sectionTotal = document.querySelector("#sectionTotal");
const sectionList = document.querySelector("#sectionList");

function getLawnEstimate(area) {
  if (area <= 40) {
    return { price: 40, label: "small lawn" };
  }

  if (area <= 80) {
    return { price: 60, label: "medium lawn" };
  }

  if (area <= 120) {
    return { price: 80, label: "large lawn" };
  }

  const extraBlocks = Math.ceil((area - 120) / 20);
  return { price: 120 + extraBlocks * 20, label: "extra large lawn" };
}

function updateQuote() {
  const area = Math.max(1, Number(lawnArea.value) || 1);
  const lawnEstimate = getLawnEstimate(area);
  const base = lawnEstimate.price;
  const accessPrice = Number(accessLevel.value);
  const accessText = accessLevel.options[accessLevel.selectedIndex].dataset.label;
  const extras = [...quoteForm.querySelectorAll("input[type='checkbox']:checked")];
  const extrasTotal = extras.reduce((sum, item) => sum + Number(item.value), 0);
  const multiplier = Number(frequency.value);
  const total = Math.round((base + accessPrice + extrasTotal) * multiplier);
  const selectedExtras = extras.map((item) => item.dataset.label).join(", ");
  const frequencyText = frequency.options[frequency.selectedIndex].text.replace(/ - .*/, "");

  quoteTotal.textContent = money.format(total);
  quoteSummary.textContent = `${area} m2 ${lawnEstimate.label}, ${accessText}, ${frequencyText}${
    selectedExtras ? `, plus ${selectedExtras}` : ""
  } - estimate only`;
}

quoteForm.addEventListener("input", updateQuote);
updateQuote();

function propertyMapQuery() {
  const address = addressInput.value.trim();

  if (!address) {
    mapStatus.textContent = "Please type the property address first.";
    addressInput.focus();
    return "";
  }

  return /dunedin/i.test(address) ? address : `${address}, Dunedin, New Zealand`;
}

showMap.addEventListener("click", () => {
  const query = propertyMapQuery();

  if (!query) {
    return;
  }

  mapFrame.src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=20&t=k&output=embed`;
  mapPreview.classList.add("has-map");
  mapStatus.textContent =
    "Close Google Maps view loaded. Screenshot this map or take a property photo, then upload it in the lawn size estimator and draw the mowing boundaries.";
});

openMaps.addEventListener("click", () => {
  const query = propertyMapQuery();

  if (!query) {
    return;
  }

  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank", "noopener");
});

const estimator = {
  ctx: estimatorCanvas.getContext("2d"),
  mask: document.createElement("canvas"),
  image: null,
  drawing: false,
  estimate: 0,
  sections: [],
  currentPhoto: "",
};

estimator.mask.width = estimatorCanvas.width;
estimator.mask.height = estimatorCanvas.height;
estimator.maskCtx = estimator.mask.getContext("2d");
estimator.maskCtx.lineCap = "round";
estimator.maskCtx.lineJoin = "round";
estimator.maskCtx.strokeStyle = "#000";
estimator.maskCtx.lineWidth = 34;
estimator.ctx.lineCap = "round";
estimator.ctx.lineJoin = "round";
estimator.ctx.strokeStyle = "rgba(217, 240, 120, 0.36)";
estimator.ctx.lineWidth = 34;

function canvasPoint(event) {
  const rect = estimatorCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * estimatorCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * estimatorCanvas.height,
  };
}

function drawPhoto() {
  estimator.ctx.clearRect(0, 0, estimatorCanvas.width, estimatorCanvas.height);

  if (!estimator.image) {
    return;
  }

  const canvasRatio = estimatorCanvas.width / estimatorCanvas.height;
  const imageRatio = estimator.image.width / estimator.image.height;
  let drawWidth = estimatorCanvas.width;
  let drawHeight = estimatorCanvas.height;
  let x = 0;
  let y = 0;

  if (imageRatio > canvasRatio) {
    drawHeight = estimatorCanvas.width / imageRatio;
    y = (estimatorCanvas.height - drawHeight) / 2;
  } else {
    drawWidth = estimatorCanvas.height * imageRatio;
    x = (estimatorCanvas.width - drawWidth) / 2;
  }

  estimator.ctx.drawImage(estimator.image, x, y, drawWidth, drawHeight);
}

function updateEstimatorStatus() {
  const pixels = estimator.maskCtx.getImageData(0, 0, estimator.mask.width, estimator.mask.height).data;
  let marked = 0;

  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] > 0) {
      marked += 1;
    }
  }

  const coverage = marked / (estimator.mask.width * estimator.mask.height);
  estimator.estimate = Math.max(10, Math.round(coverage * 260));
  estimatorStatus.textContent = `Rough selected lawn area: about ${estimator.estimate} m2. Use this only as a guide.`;
}

function estimatorTotal() {
  return estimator.sections.reduce((sum, section) => sum + section.size, 0);
}

function renderSections() {
  const total = estimatorTotal();
  sectionTotal.textContent = `${total} m2`;
  sectionList.innerHTML = "";

  estimator.sections.forEach((section, index) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>Section ${index + 1}: ${section.photo}</span><strong>${section.size} m2</strong>`;
    sectionList.append(item);
  });
}

lawnPhoto.addEventListener("change", () => {
  const file = lawnPhoto.files[0];

  if (!file) {
    return;
  }

  const image = new Image();
  image.onload = () => {
    estimator.image = image;
    estimator.currentPhoto = file.name || `photo ${estimator.sections.length + 1}`;
    estimator.maskCtx.clearRect(0, 0, estimator.mask.width, estimator.mask.height);
    estimator.estimate = 0;
    drawPhoto();
    canvasWrap.classList.add("has-photo");
    estimatorStatus.textContent = "Draw over this lawn section, then add it to the total. You can upload another photo for the next section.";
  };
  image.src = URL.createObjectURL(file);
});

estimatorCanvas.addEventListener("pointerdown", (event) => {
  if (!estimator.image) {
    estimatorStatus.textContent = "Upload or take a lawn photo first.";
    return;
  }

  estimator.drawing = true;
  estimatorCanvas.setPointerCapture(event.pointerId);
  const point = canvasPoint(event);
  estimator.ctx.beginPath();
  estimator.ctx.moveTo(point.x, point.y);
  estimator.maskCtx.beginPath();
  estimator.maskCtx.moveTo(point.x, point.y);
});

estimatorCanvas.addEventListener("pointermove", (event) => {
  if (!estimator.drawing) {
    return;
  }

  const point = canvasPoint(event);
  estimator.ctx.lineTo(point.x, point.y);
  estimator.ctx.stroke();
  estimator.maskCtx.lineTo(point.x, point.y);
  estimator.maskCtx.stroke();
});

estimatorCanvas.addEventListener("pointerup", () => {
  if (!estimator.drawing) {
    return;
  }

  estimator.drawing = false;
  updateEstimatorStatus();
});

clearDrawing.addEventListener("click", () => {
  estimator.maskCtx.clearRect(0, 0, estimator.mask.width, estimator.mask.height);
  drawPhoto();
  estimator.estimate = 0;
  estimatorStatus.textContent = estimator.image
    ? "Drawing cleared. Draw over the lawn area again."
    : "Upload or take a lawn photo to start drawing.";
});

addSection.addEventListener("click", () => {
  if (!estimator.estimate) {
    estimatorStatus.textContent = "Draw over the lawn section first, then add it to the total.";
    return;
  }

  estimator.sections.push({
    photo: estimator.currentPhoto || `photo ${estimator.sections.length + 1}`,
    size: estimator.estimate,
  });
  renderSections();
  estimator.maskCtx.clearRect(0, 0, estimator.mask.width, estimator.mask.height);
  drawPhoto();
  estimator.estimate = 0;
  estimatorStatus.textContent = "Section added. Upload or take another photo, draw another section, or apply the total for quote.";
});

applyEstimate.addEventListener("click", () => {
  const total = estimatorTotal();

  if (!total) {
    estimatorStatus.textContent = "Add at least one drawn section before applying the total.";
    return;
  }

  lawnArea.value = total;
  updateQuote();
  const sectionSummary = estimator.sections
    .map((section, index) => `Section ${index + 1}: ${section.size} m2 from ${section.photo}`)
    .join("; ");
  bookingNotes.value = `Photo lawn estimator total: about ${total} m2. ${sectionSummary}. Exact price confirmed after looking at the property and photos.`;
  estimatorStatus.textContent = `Using about ${total} m2 total in the quote calculator and booking notes.`;
  document.querySelector("#booking").scrollIntoView({ behavior: "smooth" });
});

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
