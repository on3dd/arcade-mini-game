// [TODO]: Новые типы противников, рандомный выбор
// [TODO]: Новые типы оружия, механика с боеприпасами
// [TOOD]: Добавить режим автоматической стрельбы по mousedown/mouseup и setInterval/clearInterval
// [TODO]: Меню перед началом игры, возможность ставить игру на паузу
// [TODO]: Таблица счета

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

// Преднастройки игры
let renderTimer;
let spanwTimer;
let spawnTime = 2500;
let scoreCount = 0;
let livesCount = 5;
let rocketsCount = 10;
let vx = 0;

const fps = 1000/30;
const center = canvas.height/2 - 30;

document.querySelector('#score-counter').innerHTML = scoreCount;
document.querySelector('#lives-counter').innerHTML = livesCount;
document.querySelector('#rockets-counter').innerHTML = rocketsCount;

// Массивы снарядов и врагов соответственно
let bullets = [];
let enemies = [];

// Основной класс для всех двигающихся юнитов
class Unit {
  constructor(x, y, img) {
    this.x = x || canvas.width;
    this.y = y || center;
    this.width = 80;
    this.height = 60;
    this.hp = 2;
    this.isShielded = false;
    this.img = img || enemy_img;
  }
  shield() {
    this.isShielded = true;
    setTimeout(() => this.isShielded = false, 500);
  }
  draw() {
    if (this.isShielded)  {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
      ctx.restore();
    } 
    else {
      ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
  }
}

// Подкласс для юнита игрока
class Player extends Unit {
  constructor(x, y, img) {
    super(x, y, img);
    this.hp = livesCount;
  }
  move(mouseY) {
    this.y = mouseY;
  }
  shoot(mouseY, num) {
    let bullet;
    switch (num) {
      case 0: 
        bullet = new Gun(10, mouseY);
        break;
      case 1: 
        if (rocketsCount > 0) {
          bullet = new Rocket(10, mouseY);
          changeRockets(-1);
        }
        break;
    };
    if (bullet !== undefined) bullets.push(bullet);
  }
}

// Подкласс для вражеских юнитов
class EnemyPlane extends Unit {
  constructor(x, y, speed) {
    super(x, y);
    this.speed = speed || 6;
    this.value = 50;
  }
  move() {
    this.x -= this.speed;
  }
}

// Под-подкласс для недефолтных вражеских юнитов
class NotDefaultEnemyPlane extends EnemyPlane {
  constructor(x, y, speed) {
    super(x, y);
    this.speed = speed;
  }
}

// Основной класс для всех снарядов
class Bullet {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img || gun_img;
    this.width = 60;
    this.height = 30;
  }
  move() {
    this.x += this.speed;
  }
  checkCollision() {
    let findEnemy = enemies.find(enemy => ( ( (this.y + 15 - enemy.y >= 0) && (this.y + 15 - enemy.y <= 60) ) 
    && (this.x - enemy.x >= 0) && (this.x - enemy.x <= this.speed) && (!enemy.isShielded) ) );
    // Если было найдено совпадение - обрабатываем
    // Иначе отрисовываем пулю
    if (findEnemy) { 
      findEnemy.hp -= this.dmg;
      bullets.splice(bullets.indexOf(this), 1);
      // Если hp самолета < 1 - удаляем
      // Иначе вешаем щит
      if (findEnemy.hp <= 0) {
        incScore(findEnemy.value);
        enemies.splice(enemies.indexOf(findEnemy), 1);
      }
      else findEnemy.shield();
    }
    else {
      ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
  }
}

// Подкласс для снарядов из обычной пушки
class Gun extends Bullet {
  constructor(x, y) {
    super(x, y);
    this.dmg = 1;
    this.speed = 100;
  }
}

// Подкласс для снарядов из ракетницы
class Rocket extends Bullet {
  constructor(x, y) {
    super(x, y);
    this.dmg = 2;
    this.speed = 40;
    this.img = rocket_img;
  }
  move() {
    this.x += this.speed;
    this.y += Math.random() * (5 - 10) + 5;
  }
  
}

// Отрисовка игрового поля
function renderGame() {
  renderTimer = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(clouds_1, vx, 0);
    ctx.drawImage(clouds_2, vx, 0);
    ctx.drawImage(clouds_3, vx, 0);
    ctx.drawImage(clouds_4, vx, 0);
    ctx.drawImage(clouds_1, vx+1920, 0);
    ctx.drawImage(clouds_2, vx+1920, 0);
    ctx.drawImage(clouds_3, vx+1920, 0);
    ctx.drawImage(clouds_4, vx+1920, 0);
    player.draw();

    // Двигаем все снаряды
    bullets.forEach(el => {
      el.move();
      el.checkCollision();
      // ctx.drawImage(gun_img, el.x, el.y, 60, 30);

      // Если снаряд вылетел за границы экрана - удаляем
      if (el.x >= canvas.width) bullets.splice(bullets.indexOf(el), 1);
    })

    // Двигаем всех вражеских юнитов
    enemies.forEach(el => {
      el.move();
      el.draw();
      // Если юнит вышел за границы экрана - удаляем
      if (el.x <= -80) {
        // Если игрок не под щитом - вычитаем урон
        if (!player.isShielded) changeLives(-1);
        // Если hp игрока < 1 - конец игры
        if (livesCount <= 0) clearInterval(renderTimer);
        player.shield();
        enemies.splice(enemies.indexOf(el), 1);
      }
    })

    vx -= 4;
    if (vx < -1920) vx = 0;
  }, fps);
};

// Начало создания вражеских юнитов
function addEnemy() {
  setTimeout(() => createEnemy(), 3000);
}

// Создание вражеских юнитов
function createEnemy() {
  spanwTimer = setInterval(() => {
    let y = Math.round(Math.random() * (canvas.height - 120) + 60);
    let enemy = new EnemyPlane(canvas.width, y);
    enemies.push(enemy);
  }, spawnTime);
}

// Изменение счета
function incScore(value) {
  scoreCount += value;
  document.querySelector('#score-counter').innerHTML = scoreCount;
}

// Изменение количества жизней
function changeLives(value) {
  livesCount += value;
  document.querySelector('#lives-counter').innerHTML = livesCount;
}

// Изменение количества рокет
function changeRockets(value) {
  rocketsCount += value;
  document.querySelector('#rockets-counter').innerHTML = rocketsCount;
}


const clouds_1 = new Image(); clouds_1.src = './assets/game_background_1/layers/clouds_1.png';
const clouds_2 = new Image(); clouds_2.src = './assets/game_background_1/layers/clouds_2.png';
const clouds_3 = new Image(); clouds_3.src = './assets/game_background_1/layers/clouds_3.png';
const clouds_4 = new Image(); clouds_4.src = './assets/game_background_1/layers/clouds_4.png';

const player_img = new Image(); player_img.src = './assets/Plane/Fly(1).png';
const enemy_img = new Image(); enemy_img.src = './assets/Plane/Flying_Enemy(1).png';

const gun_img = new Image(); gun_img.src = './assets/Bullet/Bullet(1).png';
const rocket_img = new Image(); rocket_img.src = './assets/Bullet/Missile(1).png';

// Начинаем игру после загрузки изображений
if ( document.images ) {
  renderGame();
  addEnemy();
}

const player = new Player(10, center, player_img);

canvas.addEventListener('mousemove', e => {
  let bounds  = canvas.getBoundingClientRect();
  let mouseY = e.clientY - bounds.top - scrollY;
  if (canvas.height - mouseY <  60) 
    mouseY = canvas.height - 60;
  player.move(mouseY);
})

canvas.addEventListener('mousedown', e => {
  let bounds  = canvas.getBoundingClientRect();
  let mouseY = e.clientY - bounds.top - scrollY + 20;
  if (canvas.height - mouseY <  60) 
    mouseY = canvas.height - 40;
  // Если была нажата левая кнопка мыши - вызываем shoot от 0
  // Иначе вызываем shoot от 1
  if (detectLeftButton(e)) player.shoot(mouseY, 0);
  else player.shoot(mouseY, 1);
})

canvas.addEventListener('contextmenu', e => e.preventDefault());

// Вспомогательная функция для определения типа нажатой клавиши мыши
function detectLeftButton(event) {
   if ('buttons' in event) {
      return event.buttons === 1;
  } else if ('which' in event) {
      return event.which === 1;
  } else {
      return (event.button == 1 || event.type == 'click');
  }
}