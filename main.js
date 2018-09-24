(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
})();

function d (a) {
  console.log(a);
}

function robot (gen, num) {
  this.x = 0;
  this.y = 590;
  this.width = 10;
  this.height = 10;
  this.colour = "blue";
  this.generation = gen;
  this.number = num;
  this.autojump = true;
  this.forward = true;
  this.nextcommand = 10;
  this.lifespan = 0;
  this.brain = {};
  this.everyrun = []
  this.history = {};
  this.resetscore = {x: 0, y: 600, time: 0, alive: true, win: false};
  this.score = this.resetscore;
  this.jumpY = 600;
  this.jumpAlter = 600;
  this.clipping = 0.1; // a small value to fix bugs
  this.speed = 5;
  this.intialSpeed = 5;
  this.boost = 3000;
  this.stick = 1000;
  this.velX = 0;
  this.velY = 0;
  this.groundSpeed = 1;
  this.airSpeed = 2.2;
  this.maxSpeed = 14;
  this.grounded = false;
  this.aired = true;
  this.moving = false;
  this.display = function () {
    txt = "Generation " + this.generation + " Number " + this.number
    ctx.font = "20px Courier";
    ctx.fillStyle = this.colour;
    ctx.fillText(txt, this.x - txt.length * 5.5, this.y - 10);
  }
  this.update = function () {
    // draw our player
    this.lifespan++;
    this.nextcommand--;
    if (this.speed < this.maxSpeed) {
      this.speed += this.boost / 100000;
    } else {
      this.speed = this.maxSpeed;
      this.speed -= this.stick / 100000;
    }
    if (this.forward) {
      this.moving = true;
      dir = 1;
    } else {
      this.moving = true;
      dir = -1;
    }
    if (this.moving) {
      // right arrow
      if (this.grounded) {
          this.velX += this.groundSpeed * dir;
      } else {
          this.velX += (this.groundSpeed + (this.speed / this.maxSpeed) * (this.airSpeed - this.groundSpeed)) * dir;
      }
      this.moving = false;
    }
    if (this.autojump) {
      // up arrow
      if (this.grounded && !this.aired) {
        if (this.speed < this.intialSpeed) {
          this.speed = this.intialSpeed;
        }
        this.velY -= this.speed;
        this.grounded = false;
      }
    } else {
        this.speed = this.intialSpeed;
    }
    this.velX *= friction;
    this.velY += gravity;

    this.y += this.velY;
    this.x += this.velX;

    if (this.x > this.score.x) {
      this.score.x = this.x;
    } else if (this.y < this.score.y) {
      this.score.y = this.y;
    }

    // start collisions

    this.aired = true;
    rk = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    if (this.y >= height-this.height) {
      this.y = height - this.height;
      this.speed = (height - this.jumpY + this.jumpAlter) / this.jumpAlter * this.speed;
      this.jumpY = height;
      this.grounded = true;
      this.aired = false;
      this.velY = 0;
      rk[4]++;
    }
    blocks = world[map];
    for (i in blocks) {
      block = blocks[i];
      if (collision(this, block)) {
        rc = block.collide(this, world, true);
      } else {
        rc = block.collide(this, world);
      }
      rn = (rc.row - 1) * 3 + rc.column - 1;
      if (rc.collided) {
        rn += 9;
      }
      rk[rn]++;
    }
    if (this.x >= width-this.width) {
        this.x = width-this.width;
        if (this.speed + (this.boost / 100000) * 2 > 3) {
          this.speed -= (this.boost / 100000) * 2;
        }
        this.velX = 0;
        rk[13]++;
    } else if (this.x <= 0) {
        this.x = 0;
        if (this.speed + (this.boost / 100000) * 2 > 3) {
          this.speed -= (this.boost / 100000) * 2;
        }
        this.velX = 0;
        rk[13]++;
    }
    if (this.nextcommand <= 0) {
      if (!this.brain[rk.toString()]) {
        this.brain[rk.toString()] = 0.5;
      }
      this.forward = Math.random() < this.brain[rk.toString()];
      this.history[this.lifespan] = {
        place: rk.toString(),
        movement: this.forward
      }
      this.nextcommand = 5 //Math.floor(Math.random() * 5);
    }
    // draw a small red box, which will eventually become our this.
    // draws the map selected
    ctx.fillStyle = this.colour;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
  this.scoring = function () {
    brain = {}
    for (i in this.history) {
      if (!brain[this.history[i].place]) {
        brain[this.history[i].place] = {
          true: 0,
          false: 0
        }
      }
      brain[this.history[i].place][this.history[i].movement]++;
    }
    for (i in brain) {
      brain[i] = (brain[i].true + 1) / (brain[i].true + brain[i].false + 2)
    }
    return brain;
  }
  this.evolve = function (brain) {
    this.brain = brain;
    this.history = [];
    this.everyrun = [];
    this.generation++;
    this.x = 0;
    this.y = 590;
    this.velX = 0;
    this.velY = 0;
    this.speed = 0;
    this.lifespan = 0;
    this.score = this.resetscore;
  }
}

function block (x, y, width, height, type) {
  type = typeof type  === "undefined" ? "solid" : type;
  // creates a box object
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
  this.type = type;
  switch (this.type) {
    case "solid":
      // normal walls
      this.collide = function (player, world, collided) {
        // calculating which side of the block the player is closest to
        // collisions only happen against the wall
        if (player.y - player.velY + player.height < this.y) {
          row = 1;
        } else if (player.y - player.velY > this.y + this.height) {
          row = 3;
        } else {
          row = 2;
        }
        if (player.x - player.velX + player.width < this.x) {
          column = 1;
        } else if (player.x - player.velX > this.x + this.width) {
          column = 3;
        } else {
          column = 2;
        }
        if (row == 2 && column == 2) {
            leftS = Math.abs(this.x - (player.x + (player.width / 2)));
            rightS = Math.abs((this.x + this.width)- (player.x + (player.width / 2)));
            topS = Math.abs(this.y - (player.y + (player.height / 2) - player.velY));
            bottomS = Math.abs((this.y + this.height) - (player.y + (player.height / 2)));
            minimun = Math.min(leftS, rightS, topS, bottomS);
            if (topS <= minimun) {
                row = 1;
            } else if (leftS <= minimun) {
                column = 1;
            } else if (rightS <= minimun) {
                column = 3;
            } else if (bottomS <= minimun) {
                row = 3;
            }
        }
        if (collided) {
          if (column == 1) {
            // left
            player.x = this.x - player.width - player.clipping;
            player.speed -= (player.boost / 100000) * 3;
            player.velX = 0;
          }
          if (column == 3) {
            // right
            player.x = this.x + this.width + player.clipping;
            player.speed -= (player.boost / 100000) * 3;
            player.velX = 0;
          }
          if (row == 3) {
            // down
            player.y = this.y + this.height + player.clipping;
            player.speed -= (player.boost / 100000) * 20;
            player.velY = -player.velY * player.speed / player.maxSpeed;
          }
          if (row == 1) {
            // top
            player.y = this.y - player.height - player.clipping;
            player.speed = (this.y - player.jumpY + player.jumpAlter) / player.jumpAlter * player.speed;
            player.jumpY = this.y;
            player.grounded = true;
            player.aired = false;
            player.velY = 0;
          }
        }
        return {row: row, column: column, type: this.type, collided: collided};
      }
      break;
    case "acid":
      // normal hazards
      this.collide = function (player, world, collided) {
        if (player.y - player.velY + player.height < this.y) {
          row = 1;
        } else if (player.y - player.velY > this.y + this.height) {
          row = 3;
        } else {
          row = 2;
        }
        if (player.x - player.velX + player.width < this.x) {
          column = 1;
        } else if (player.x - player.velX > this.x + this.width) {
          column = 3;
        } else {
          column = 2;
        }
        if (row == 2 && column == 2) {
            leftS = Math.abs(this.x - (player.x + (player.width / 2)));
            rightS = Math.abs((this.x + this.width)- (player.x + (player.width / 2)));
            topS = Math.abs(this.y - (player.y + (player.height / 2) - player.velY));
            bottomS = Math.abs((this.y + this.height) - (player.y + (player.height / 2)));
            minimun = Math.min(leftS, rightS, topS, bottomS);
            if (topS <= minimun) {
                row = 1;
            } else if (leftS <= minimun) {
                column = 1;
            } else if (rightS <= minimun) {
                column = 3;
            } else if (bottomS <= minimun) {
                row = 3;
            }
        }
        if (collided) {
          player.x = 0;
          player.y = 590;
          player.velX = 0;
          player.velY = 0;
          player.speed = 0;
          player.score.alive = false;
          player.everyrun.push({actions: player.scoring(), score: player.score});
          player.lifespan = 0;
          if (player.generation != 0) {
            player.history = {};
            player.score = player.resetscore;
          }
        }
        return {row: row, column: column, type: this.type, collided: collided};
      }
      break;
    case "door":
      this.collide = function (player, world, collided) {
        if (player.y - player.velY + player.height < this.y) {
          row = 1;
        } else if (player.y - player.velY > this.y + this.height) {
          row = 3;
        } else {
          row = 2;
        }
        if (player.x - player.velX + player.width < this.x) {
          column = 1;
        } else if (player.x - player.velX > this.x + this.width) {
          column = 3;
        } else {
          column = 2;
        }
        if (row == 2 && column == 2) {
            leftS = Math.abs(this.x - (player.x + (player.width / 2)));
            rightS = Math.abs((this.x + this.width)- (player.x + (player.width / 2)));
            topS = Math.abs(this.y - (player.y + (player.height / 2) - player.velY));
            bottomS = Math.abs((this.y + this.height) - (player.y + (player.height / 2)));
            minimun = Math.min(leftS, rightS, topS, bottomS);
            if (topS <= minimun) {
                row = 1;
            } else if (leftS <= minimun) {
                column = 1;
            } else if (rightS <= minimun) {
                column = 3;
            } else if (bottomS <= minimun) {
                row = 3;
            }
        }
        if (collided) {
          player.x = 0;
          player.y = 590;
          player.velX = 0;
          player.velY = 0;
          player.speed = 0;
          player.score.time = player.lifespan;
          if (topscore > player.score.time || topscore == "none") {
            topscore = player.score.time;
          }
          player.score.win = true;
          player.everyrun.push({actions: player.scoring(), score: player.score});
          player.lifespan = 0;
          if (player.generation != 0) {
            player.history = {};
            player.score = player.resetscore;
          }
          d(player);
          completions++;
        }
        return {row: row, column: column, type: this.type, collided: collided};
      }
      break;
    default:
      this.collide = function (player, world) {
        console.log("error wtf is this block: " + this.type);
      }
  }
}

document.body.addEventListener("keydown", function(e) {
    keys[e.keyCode] = true;
});

document.body.addEventListener("keyup", function(e) {
    keys[e.keyCode] = false;
});

function buildLevel(blocks) {
    // draws the map
    for (i in blocks) {
      block = blocks[i];
      if (block.type == "acid") {
        ctx.fillStyle = "green";
      } else if (block.type == "door") {
        ctx.fillStyle = "yellow";
      } else {
        ctx.fillStyle = "black";
      }
      ctx.fillRect(blocks[i].x, blocks[i].y, blocks[i].width, blocks[i].height);
    }
}

// list of levels

var world = {
  name: "Pattyboyo Adventures",
  speed: 14,
  x: 0,
  y: 590,
  lvl1 : [new block(600, 300, 50, 300),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl2"}),
  ],
  lvl2 : [new block(400, 300, 50, 300),
    new block(800, 300, 50, 300),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl3"}),
  ],
  lvl3 : [new block(350, 550, 550, 50, "acid"),
    new block(300, 300, 50, 300),
    new block(600, 300, 50, 300),
    new block(900, 300, 50, 300),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl4"}),
  ],
  lvl4 : [new block(400, 450, 50, 150),
    new block(800, 150, 50, 450),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl5"}),
  ],
  lvl5 : [new block(400, 300, 50, 300, "acid"),
    new block(800, 300, 50, 300, "acid"),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl6"}),
  ],
  lvl6 : [new block(400, 450, 50, 150),
    new block(800, 150, 50, 450),
    new block(400, 0, 50, 350),
    new block(800, 0, 50, 50),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl7"}),
  ],
  lvl7 : [new block(400, 300, 50, 50),
    new block(800, 0, 50, 600),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl8"}),
  ],
  lvl8 : [new block(400, 50, 100, 50),
    new block(400, 200, 100, 50),
    new block(400, 350, 100, 50),
    new block(400, 500, 100, 50),
    new block(800, 0, 50, 600),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl9"}),
  ],
  lvl9 : [new block(450, 0, 100, 50),
    new block(450, 150, 100, 50),
    new block(450, 300, 100, 50),
    new block(450, 450, 100, 50),
    new block(700, 100, 100, 50),
    new block(700, 250, 100, 50),
    new block(700, 400, 100, 50),
    new block(700, 550, 100, 50),
    new block(400, 0, 50, 500),
    new block(800, 100, 50, 500),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl10"}),
  ],
  lvl10 : [new block(800, 450, 50, 150, "acid"),
    new block(400, 350, 50, 250, "acid"),
    new block(800, 0, 50, 400, "acid"),
    new block(400, 0, 50, 300, "acid"),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl11"}),
  ],
  lvl11 : [new block(800, 450, 50, 150, "acid"),
    new block(400, 350, 50, 250, "acid"),
    new block(800, 0, 50, 400, "acid"),
    new block(400, 0, 50, 300, "acid"),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "lvl12"}),
  ],
  lvl12 : [new block(450, 550, 590, 50, "acid"),
    new block(850, 0, 190, 50, "acid"),
    new block(1010, 300, 190, 50, "acid"),
    new block(400, 0, 50, 600),
    new block(800, 0, 50, 600),
    new block(200, 300, 50, 50),
    new block(600, 300, 50, 50),
    new block(1170, 570, 30, 30, "door", {x: 0, y: 590, map: "ad_beginner", place: "win"}),
  ],
  up : [new block(100, 500, 100, 100),

new block(300, 400, 100, 100),

new block(500, 300, 100, 100),

new block(700, 200, 100, 100),

new block(900, 100, 100, 500),

new block(1000, 550, 200, 50, "door", {x: 0, y: 0, map: "ad_caverns", place: "test"}),

new block(200, 550, 700, 50, "acid")],
  lavapit : [new block(0, 0, 550, 550),

new block(650, 50, 550, 550),

new block(0, 500, 600, 50),

new block(600, 400, 600, 50),

new block(0, 300, 600, 50),

new block(600, 200, 600, 50),

new block(0, 100, 600, 50),

new block(1150, 0, 50, 50, "door", {x: 0, y: 0, map: "ad_caverns", place: "test"}),
  ],
  butt : [new block(950, 150, 50, 450, "acid"),

new block(700, 250, 50, 350, "acid"),

new block(450, 350, 50, 250, "acid"),

new block(200, 450, 50, 150, "acid"),

new block(200, 550, 800, 50, "acid"),

new block(300, 500, 100, 100),

new block(550, 400, 100, 200),

new block(800, 300, 100, 300),

new block(1000, 550, 200, 50, "door", {x: 0, y: 0, map: "ad_caverns", place: "test"}),],
pie:[new block(250, 550, 700, 50, "acid"),

new block(200, 400, 50, 200),

new block(450, 300, 50, 300),

new block(650, 450, 50, 150),

new block(800, 250, 50, 350),

new block(950, 500, 50, 100),

new block(200, 0, 50, 250, "acid"),

new block(450, 0, 50, 150, "acid"),

new block(650, 0, 50, 300, "acid"),

new block(800, 0, 50, 100, "acid"),

new block(950, 0, 50, 350, "acid"),

new block(1000, 550, 200, 50, "door", {x: 0, y: 0, map: "ad_caverns", place: "test"}),

new block(0, 0, 1200, 50),

new block(150, 0, 150, 50),

new block(400, 0, 150, 50),

new block(600, 0, 150, 50),

new block(750, 0, 150, 50),

new block(900, 0, 150, 50),]
}

// setting up canvas
var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d"),
    width = 1200,
    height = 600,
    friction = 0.8,
    gravity = 0.3,
    player = {
      x: 0,
      y: 590,
      width: 10,
      height: 10,
      colour: "red",
      generation: 0,
      number: 0,
      autojump: true,
      forward: true,
      lifespan: 0,
      brain: {},
      history: {},
      everyrun: [],
      resetscore: {x: 0, y: 600, time: 0, alive: true, win: false},
      score: {x: 0, y: 600, time: 0, alive: true, win: false},
      jumpY: 600,
      jumpAlter: 600,
      clipping: 0.1, // a small value to fix bugs
      speed: 5,
      intialSpeed: 5,
      boost: 3000,
      stick: 1000,
      velX: 0,
      velY: 0,
      groundSpeed: 1,
      airSpeed: 2.2,
      maxSpeed: 14,
      grounded : false,
      aired : true,
      moving : false,
      display : function () {
        txt = "IM ONLY HUMAN!!!!"
        ctx.font = "20px Courier";
        ctx.fillStyle = this.colour;
        ctx.fillText(txt, this.x - txt.length * 5.5, this.y - 10);
      },
      update : function () {
        this.lifespan++;
        // draw our player
        if (this.speed < this.maxSpeed) {
          if ((keys[39] || keys[37]) && !(keys[39] && keys[37])) {
            this.speed += this.boost / 100000;
          } else {
            this.speed -= this.stick / 100000;
          }
        } else {
          if ((keys[39] || keys[37]) && !(keys[39] && keys[37])) {
            this.speed = this.maxSpeed;
          } else {
            this.speed = this.maxSpeed;
            this.speed -= this.stick / 100000;
          }
        }
        if (keys[39] && keys[37]) {
        } else if (keys[39]) {
          this.moving = true;
          dir = 1;
          pp = true;
        } else if (keys[37]) {
          this.moving = true;
          dir = -1;
          pp = false;
        }
        if (this.moving) {
          // right arrow
          if (this.grounded) {
              this.velX += this.groundSpeed * dir;
          } else {
              this.velX += (this.groundSpeed + (this.speed / this.maxSpeed) * (this.airSpeed - this.groundSpeed)) * dir;
          }
        }
        if (keys[32]) {
          this.autojump = !this.autojump;
        }
        if (keys[38] || this.autojump) {
          // up arrow
          if (this.flying){
              this.y -= this.flyingSpeed;
          } else {
              if (this.grounded && !this.aired) {
                if (this.speed < this.intialSpeed) {
                  this.speed = this.intialSpeed;
                }
                this.velY -= this.speed;
                this.grounded = false;
              }
          }
        } else {
            this.speed = this.intialSpeed;
        }
        this.velX *= friction;
        this.velY += gravity;

        this.y += this.velY;
        this.x += this.velX;

        // start collisions

        this.aired = true;
        rk = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        if (this.y >= height-this.height) {
          this.y = height - this.height;
          this.speed = (height - this.jumpY + this.jumpAlter) / this.jumpAlter * this.speed;
          this.jumpY = height;
          this.grounded = true;
          this.aired = false;
          this.velY = 0;
          rk[4]++;
        }
        blocks = world[map];
        for (i in blocks) {
          block = blocks[i];
          if (collision(this, block)) {
            rc = block.collide(this, world, true);
          } else {
            rc = block.collide(this, world);
          }
          rn = (rc.row - 1) * 3 + rc.column - 1;
          if (rc.collided) {
            rn += 9;
          }
          rk[rn]++;
        }
        if (this.x >= width-this.width) {
            this.x = width-this.width;
            if (this.speed + (this.boost / 100000) * 2 > 3) {
              this.speed -= (this.boost / 100000) * 2;
            }
            this.velX = 0;
            rk[13]++;
        } else if (this.x <= 0) {
            this.x = 0;
            if (this.speed + (this.boost / 100000) * 2 > 3) {
              this.speed -= (this.boost / 100000) * 2;
            }
            this.velX = 0;
            rk[13]++;
        }
        if (this.moving) {
          if (!this.brain[rk.toString()]) {
            this.brain[rk.toString()] = 0.5;
          }
          this.forward = Math.random() < this.brain[rk.toString()];
          this.history[this.lifespan] = {
            place: rk.toString(),
            movement: pp
          }
          this.moving = false;
        }
        // draw a small red box, which will eventually become our this.
        // draws the map selected
       
        ctx.fillStyle = "red";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // for (i in enemies) {
        //   enemy = enemies[i];
        //   ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        // }
        // run through the loop again
        // sends x and y coordinates to server
      },
      scoring : function () {
        brain = {}
        for (i in this.history) {
          if (!brain[this.history[i].place]) {
            brain[this.history[i].place] = {
              true: 0,
              false: 0
            }
          }
          brain[this.history[i].place][this.history[i].movement]++;
        }
        for (i in brain) {
          brain[i] = (brain[i].true + 1) / (brain[i].true + brain[i].false + 2)
        }
        return brain;
      }
    },
    map = "pie",
    frames = 0,
    population = 50,
    generation = 1,
    completions = 0,
    topscore = "none",
    robots = [],
    keys = []

canvas.width = width;
canvas.height = height;

function collision(rectP, rect){
  // checks normal rectangular collision
  // rectP is the player and rect is the block
  if (rectP.x < rect.x + rect.width &&
    rectP.x + rectP.width > rect.x &&
    rectP.y < rect.y + rect.height &&
    rectP.height + rectP.y > rect.y) {
    return true;
  } else {
    return false;
  }
}

function evolve(command) {
  generation++;
  d(generation)
  d(frames)
  if (command == "best") {
    megabrain = {};
    megaarr = [];
    winner = false;
    for (i in robots) {
      robot = robots[i];
      robot.x = 0;
      robot.y = 590;
      robot.velX = 0;
      robot.velY = 0;
      robot.speed = 0;
      robot.score.alive = false;
      robot.everyrun.push({actions: robot.scoring(), score: robot.score});
      robot.lifespan = 0;
      if (robot.generation != 0) {
        robot.history = {};
        robot.score = player.resetscore;
      }
      for (i in robot.everyrun) {
        megaarr.push(robot.everyrun[i]);
      }
    }
    topx = 0;
    topy = 600;
    toptime = 0;
    win = false;
    tops = {
      x: -1,
      y: -1,
      time: -1,
    }
    for (i in megaarr) {
      bot = megaarr[i].score;
      if (bot.x > topx) {
        topx = bot.x;
        tops.x = i;
      }
      if (bot.y < topy) {
        topy = bot.y;
        tops.y = i;
      }
      if (bot.win) {
        if (bot.time < toptime || !win) {
          toptime = bot.time;
          tops.time = i;
          win = true;
        }
      }
    }
    if (win) {
      winboys = [megaarr[tops.time]];
    } else {
      winboys = [megaarr[tops.x], megaarr[tops.y]];
    }
    for (i in robots) {
        robot = robots[i];
        robot.evolve(winboys[Math.floor(Math.random() * winboys.length)].actions)
      }
  } else if (command == "player") {
    for (i in robots) {
      robots[i].evolve(player.scoring());
    }
  }
}

function update() {
  frames++;
  document.getElementById("banner").innerHTML = "<h1>FRAMES: "+frames+"; GENERATION: " + generation + "; COMPLETIONS: " + completions + "; TOP SCORE: " + topscore+";</h1>";
  ctx.clearRect(0,0,width,height);
  for (i in robots) {
    robots[i].update();
  }
  player.update();
  if (keys[9]) {
    for (i in robots) {
      robots[i].display();
    }
    player.display();
  }
  if (keys[83]) {
    for (i in robots) {
      robots[i].scoring();
    }
  }
  buildLevel(world[map]);
  // if (Math.random() < 0.0001) {
  //   evolve("best");
  //   console.log("evolved");
  // }
  setTimeout(update, 15);
}

window.addEventListener("load", function() {
  for (i = 1; i <= population; i++) { 
    robots.push(new robot(1, i));
  }
  update();
});

window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40, 9].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);


window.addEventListener("keyup", function(e) {
    if(e.keyCode == 32){
        evolve("best");
    }
    if(e.keyCode == 80){
        evolve("player");
    }
}, false);
