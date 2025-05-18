const pages = [
    {
        image: "pages/page1.png",
        signals: [
            { name: "Signal 1", x: 91.0374984741211, y: 309.52500915527344 },
            { name: "Signal 2", x: 124.0374984741211, y: 311.52500915527344 },
            { name: "Signal 3", x: 138.0374984741211, y: 311.52500915527344 },
            { name: "Signal 4", x: 177.0374984741211, y: 312.52500915527344 },
            { name: "Signal 5", x: 192.0374984741211, y: 310.52500915527344 }
        ]
    },
    {
        image: "pages/page2.png",
        signals: [
            { name: "Signal 6", x: 91.0374984741211, y: 267.52500915527344 },
            { name: "Signal 7", x: 124.0374984741211, y: 267.52500915527344 },
            { name: "Signal 8", x: 143.0374984741211, y: 266.52500915527344 },
            { name: "Signal 9", x: 179.0374984741211, y: 266.52500915527344 },
            { name: "Signal 10", x: 193.0374984741211, y: 265.52500915527344 }
        ]
    }
];

let currentPageIndex = 0;
let currentSignalIndex = 0;

const signalNameElement = document.getElementById("signal-name");
const imageContainer = document.getElementById("image-container");
const schemaImage = document.getElementById("schema-image");

function displayNextSignal() {
    const currentPage = pages[currentPageIndex];
    const currentSignal = currentPage.signals[currentSignalIndex];
    signalNameElement.textContent = currentSignal.name;
}

function displayNextPage() {
    const currentPage = pages[currentPageIndex];
    schemaImage.src = currentPage.image;
    currentSignalIndex = 0;
    displayNextSignal();
}

displayNextPage();

imageContainer.addEventListener("click", (event) => {
    const rect = schemaImage.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const currentPage = pages[currentPageIndex];
    const currentSignal = currentPage.signals[currentSignalIndex];
    const distance = Math.sqrt(
        Math.pow(clickX - currentSignal.x, 2) + Math.pow(clickY - currentSignal.y, 2)
    );

    if (distance < 20) { // 20px tolerance for clicking
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        overlay.style.left = `${currentSignal.x}px`;
        overlay.style.top = `${currentSignal.y}px`;
        overlay.textContent = currentSignal.name;
        imageContainer.appendChild(overlay);

        currentSignalIndex++;
        if (currentSignalIndex < currentPage.signals.length) {
            displayNextSignal();
        } else {
            currentPageIndex++;
            if (currentPageIndex < pages.length) {
                displayNextPage();
            } else {
                signalNameElement.textContent = "Game Over!";
            }
        }
    }
});
