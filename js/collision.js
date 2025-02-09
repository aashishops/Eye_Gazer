window.saveDataAcrossSessions = false;

const collisionCanvas = "collisionCanvas";
var force;
var node, target;
var score = 0;
var canvas, ctx;
var calibrationPoints = [];
var calibrationIndex = 0;
var calibrationClicks = 0;
var isCalibrated = false;
var gameTime = 60;
var timerInterval;

window.onload = async function () {
    alert("Calibration required: Look at the point and click on it 9 times to calibrate.");
    if (!window.saveDataAcrossSessions) {
        localforage.setItem('webgazerGlobalData', null);
        localforage.setItem('webgazerGlobalSettings', null);
    }

    const webgazerInstance = await webgazer.setRegression('ridge')
        .setTracker('TFFacemesh')
        .begin();

    webgazerInstance.showVideoPreview(true)
        .showPredictionPoints(false)
        .applyKalmanFilter(true);

    setupCollisionSystem();
    webgazer.setGazeListener(collisionEyeListener);
    createStartButton();
};

function createStartButton() {
    let startButton = document.createElement("button");
    startButton.innerText = "Start Game";
    startButton.style.position = "absolute";
    startButton.style.top = "10px";
    startButton.style.left = "50%";
    startButton.style.transform = "translateX(-50%)";
    startButton.style.padding = "10px 20px";
    startButton.style.fontSize = "16px";
    startButton.style.cursor = "pointer";
    document.body.appendChild(startButton);
    startButton.addEventListener("click", resetGame);
}

function resetGame() {
    score = 0;
    gameTime = 60;
    isCalibrated = false;
    calibrationIndex = 0;
    calibrationClicks = 0;
    alert("Calibration required: Look at the point and click on it 9 times to calibrate.");
    canvas.addEventListener("click", handleCalibrationClick);
    drawCalibrationPoint();
}

function setupCollisionSystem() {
    var width = 1000;
    var height = 500;

    calibrationPoints = [
        { x: width * 0.1, y: height * 0.1 }, { x: width * 0.5, y: height * 0.1 }, { x: width * 0.9, y: height * 0.1 },
        { x: width * 0.9, y: height * 0.5 }, { x: width * 0.1, y: height * 0.5 },
        { x: width * 0.1, y: height * 0.9 }, { x: width * 0.5, y: height * 0.9 }, { x: width * 0.9, y: height * 0.9 },
        { x: width * 0.5, y: height * 0.5 }
    ];

    node = { radius: 15, fixed: true };
    target = getRandomTargetPosition(width, height);

    force = d3.layout.force()
        .gravity(0.05)
        .charge(0)
        .nodes([node])
        .size([width, height])
        .start();

    canvas = document.createElement("canvas");
    canvas.id = collisionCanvas;
    canvas.width = width;
    canvas.height = height;
    canvas.style.position = "absolute";
    canvas.style.top = "60%";
    canvas.style.left = "50%";
    canvas.style.transform = "translate(-50%, -50%)";
    canvas.style.border = "2px solid white";
    canvas.style.backgroundColor = "#333";
    document.body.appendChild(canvas);

    ctx = canvas.getContext("2d");
    canvas.addEventListener("click", handleCalibrationClick);
    drawCalibrationPoint();
}

function drawCalibrationPoint() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(calibrationPoints[calibrationIndex].x, calibrationPoints[calibrationIndex].y, 10, 0, Math.PI * 2);
    ctx.fill();
}

function handleCalibrationClick() {
    calibrationClicks++;
    if (calibrationClicks >= 9) {
        calibrationClicks = 0;
        calibrationIndex++;
        if (calibrationIndex >= calibrationPoints.length) {
            isCalibrated = true;
            canvas.removeEventListener("click", handleCalibrationClick);
            startGame();
            return;
        }
    }
    drawCalibrationPoint();
}

function startGame() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameTime--;
        if (gameTime <= 0) {
            clearInterval(timerInterval);
            alert("Game Over! Your score: " + score);
        }
        drawScene();
    }, 1000);
    drawScene();
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let w = canvas.width / 2;
    let h = canvas.height / 2;

    // Draw quadrants
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = "blue";
    ctx.fillRect(w, 0, w, h);
    
    ctx.fillStyle = "green";
    ctx.fillRect(0, h, w, h);
    
    ctx.fillStyle = "yellow";
    ctx.fillRect(w, h, w, h);

    // Draw the black target ball
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw the white eye-tracking ball
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(node.x || canvas.width / 2, node.y || canvas.height / 2, node.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw score and time
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Score: " + score, 10, 30);
    ctx.fillText("Time: " + gameTime + "s", 10, 60);
}

function collisionEyeListener(data) {
    if (!data || !isCalibrated || gameTime <= 0) return;

    var rect = canvas.getBoundingClientRect();
    node.x = data.x - rect.left;
    node.y = data.y - rect.top;

    // Check if the eye-tracking ball is in the same quadrant as the target
    let eyeQuadrant = getQuadrant(node.x, node.y, canvas.width, canvas.height);
    let targetQuadrant = getQuadrant(target.x, target.y, canvas.width, canvas.height);

    if (eyeQuadrant === targetQuadrant) {
        score++;
        target = getRandomTargetPosition(canvas.width, canvas.height);
    }

    drawScene();
}

function getQuadrant(x, y, width, height) {
    if (x < width / 2 && y < height / 2) return "red"; // Top-left
    if (x >= width / 2 && y < height / 2) return "blue"; // Top-right
    if (x < width / 2 && y >= height / 2) return "green"; // Bottom-left
    return "yellow"; // Bottom-right
}

function getRandomTargetPosition(width, height) {
    let quadrant = ["red", "blue", "green", "yellow"];
    let randomQuadrant = quadrant[Math.floor(Math.random() * 4)];
    
    if (randomQuadrant === "red") return { x: width * 0.25, y: height * 0.25, radius: 30 };
    if (randomQuadrant === "blue") return { x: width * 0.75, y: height * 0.25, radius: 30 };
    if (randomQuadrant === "green") return { x: width * 0.25, y: height * 0.75, radius: 30 };
    return { x: width * 0.75, y: height * 0.75, radius: 30 };
}
