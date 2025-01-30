window.addEventListener('DOMContentLoaded', (event) => {
    window.saveDataAcrossSessions = false;

    const collisionCanvas = document.getElementById("collisionCanvas");
    const ctx = collisionCanvas.getContext("2d");

    var force;
    var node, target;
    var score = 0;

    window.onload = async function () {
        // Setup canvas size
        collisionCanvas.width = 800;
        collisionCanvas.height = 600;

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
    };

    window.onbeforeunload = function () {
        if (window.saveDataAcrossSessions) {
            webgazer.end();
        } else {
            localforage.clear();
        }
    };

    function setupCollisionSystem() {
        var width = window.innerWidth;
        var height = window.innerHeight;

        node = { radius: 10, fixed: true };
        target = { x: Math.random() * width, y: Math.random() * height, radius: 20 };

        // Initialize force simulation
        force = d3.layout.force()
            .gravity(0.05)
            .charge(0)
            .nodes([node])
            .size([width, height])
            .start();

        // Draw target and gaze balls
        drawBalls();

        force.on("tick", function () {
            // Update gaze ball position based on the eye tracking
            ctx.clearRect(0, 0, width, height); // Clear the canvas
            drawBalls();
        });
    }

    function drawBalls() {
        // Draw gaze ball
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "orange";
        ctx.fill();

        // Draw target ball
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();

        // Draw score text
        ctx.font = "24px Arial";
        ctx.fillStyle = "white";
        ctx.fillText("Score: " + score, 20, 40);
    }

    var collisionEyeListener = function (data) {
        if (!data) return;

        // Constrain gaze ball inside the canvas
        var canvasWidth = collisionCanvas.width;
        var canvasHeight = collisionCanvas.height;

        node.px = Math.min(Math.max(data.x, node.radius), canvasWidth - node.radius);
        node.py = Math.min(Math.max(data.y, node.radius), canvasHeight - node.radius);

        force.resume();

        var dx = node.px - target.x;
        var dy = node.py - target.y;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < target.radius + node.radius) {
            score++;
            target.x = Math.random() * canvasWidth;
            target.y = Math.random() * canvasHeight;
        }
    };
});
