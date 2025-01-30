window.saveDataAcrossSessions = false;

const collisionSVG = "collisionSVG";
var force;
var node, target;
var score = 0;
var calibrationCompleted = false;
var calibrationPoints = [
    { x: 100, y: 100 },
    { x: 500, y: 100 },
    { x: 100, y: 300 },
    { x: 500, y: 300 },
    { x: 300, y: 200 }
];

window.onload = async function () {
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

    setupCanvas();
    showCalibrationPoints();
};

window.onbeforeunload = function () {
    if (window.saveDataAcrossSessions) {
        webgazer.end();
    } else {
        localforage.clear();
    }
};

function setupCanvas() {
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function showCalibrationPoints() {
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    calibrationPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 10, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Add click event to handle calibration completion
    canvas.addEventListener("click", handleCalibrationClick);
}

function handleCalibrationClick(event) {
    var canvas = document.getElementById("gameCanvas");
    var rect = canvas.getBoundingClientRect();
    var clickX = event.clientX - rect.left;
    var clickY = event.clientY - rect.top;

    calibrationPoints = calibrationPoints.filter(point => {
        var dx = clickX - point.x;
        var dy = clickY - point.y;
        return Math.sqrt(dx * dx + dy * dy) > 10; // Remove point if clicked
    });

    if (calibrationPoints.length === 0) {
        completeCalibration();
    } else {
        // Redraw remaining points
        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        showCalibrationPoints();
    }
}

function completeCalibration() {
    calibrationCompleted = true;
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    setupCollisionSystem();
    webgazer.setGazeListener(collisionEyeListener);
}

function setupCollisionSystem() {
    var canvas = document.getElementById("gameCanvas");
    var width = canvas.width;
    var height = canvas.height;

    node = { radius: 10, fixed: true };
    target = { x: Math.random() * width, y: Math.random() * height, radius: 20 };

    force = d3.layout.force()
        .gravity(0.05)
        .charge(0)
        .nodes([node])
        .size([width, height])
        .start();

    var svg = d3.select("#gameCanvas").append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("circle")
        .attr("id", "gazeBall")
        .attr("r", node.radius)
        .style("fill", "orange");

    svg.append("circle")
        .attr("id", "targetBall")
        .attr("r", target.radius)
        .attr("cx", target.x)
        .attr("cy", target.y)
        .style("fill", "red");

    svg.append("text")
        .attr("id", "scoreText")
        .attr("x", 20)
        .attr("y", 40)
        .attr("fill", "white")
        .attr("font-size", "24px")
        .text("Score: 0");

    force.on("tick", function () {
        svg.select("#gazeBall")
            .attr("cx", node.x)
            .attr("cy", node.y);
    });
}

var collisionEyeListener = function (data) {
    if (!data || !calibrationCompleted) return;

    node.px = data.x;
    node.py = data.y;
    force.resume();

    var dx = data.x - target.x;
    var dy = data.y - target.y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < target.radius + node.radius) {
        score++;
        d3.select("#scoreText").text("Score: " + score);
        target.x = Math.random() * 600;
        target.y = Math.random() * 400;
        d3.select("#targetBall").attr("cx", target.x).attr("cy", target.y);
    }
};
