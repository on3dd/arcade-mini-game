// [TODO]: Меню перед началом игры
// [TODO]: Таблица счета

const canvas = document.querySelector('#canvas');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

const localStorage = window.localStorage;

// Преднастройки игры
let renderTimer,              // Таймер для рендеринга игры
    spanwTimer,               // Таймер для спайна юнитов
    shootCounter,             // Таймер для автоматической стрельбы
    spawnTime = 2500,         // Интервал между спавном юнитов
    scoreCount = 0,           // Счетчик очков
    livesCount = 5,           // Счетчик жизней
    levelsCount = 0,          // Счетчик уровней
    rocketsCount = 10,        // Счетчик рокет
    killsCount = 0,           // Счетчик убитых врагов
    vx = 0,                   // Отклонение по x
    kLvl = 0,                 // Коэффициент для усиления вражеских юнитов
    isPaused = false,         // Поставлена ли игра на паузу
    isBossStage = false;      // Находится ли уровень на стадии босса

const fps = 1000/60;                     // Количество обновлений игрового поля в секунду
const CENTER = canvas.height/2 - 30;     // Центр canvas'а - начальная координата персонажа

const gameboard = document.getElementsByClassName('gameboard')[0];
const cursor = document.getElementsByTagName('body')[0];              // Я не помню, почему я так его назвал o_0

// Массивы снарядов и врагов соответственно
let bullets = [],
    enemies = [];

// Основной класс для всех двигающихся юнитов
class Unit {
  constructor(x, y, img) {
    this.x = x || canvas.width;
    this.y = y || CENTER;
    this.width = 80;
    this.height = 60;
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
  constructor(x, y) {
    super(x, y);
    this.hp = 2 + 2*kLvl;
    this.speed = 3 + 0.1*kLvl;
    this.value = 50;
    this.dmg = 1;
    this.isBoss = false;
  }
  move() {
    this.x -= this.speed;
  }
}

// Под-подкласс для недефолтных вражеских юнитов
class EliteEnemyPlane extends EnemyPlane {
  constructor(x, y) {
    super(x, y);
    this.width = 100;
    this.height = 75;
    this.hp = 3 + 3*kLvl;
    this.speed = 4.5 + 0.1*kLvl;
    this.value = 75;
    this.img = elite_enemy_img;
  }
}

// Под-подкласс для недефолтных вражеских юнитов
class HeavyEnemyPlane extends EnemyPlane {
  constructor(x, y) {
    super(x, y);
    this.width = 120;
    this.height = 90;
    this.hp = 5 + 5*kLvl;
    this.speed = 3 + 0.1*kLvl;
    this.value = 100;
    this.img = heavy_enemy_img;
  }
}

// Под-подкласс для недефолтных вражеских юнитов
class Boss extends EnemyPlane {
  constructor(x) {
    super(x);
    this.y = CENTER - 120 + 30;
    this.width = 360;
    this.height = 240;
    this.hp = 15 + 10*kLvl;
    this.speed = 3 + 0.1*kLvl;
    this.value = 300;
    this.dmg = 5;
    this.img = boss_img;
    this.isBoss = true;
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
    let findEnemy = enemies.find(enemy => ( ( (this.y + 15 - enemy.y >= 0) && (this.y + 15 - enemy.y <= enemy.height) ) 
    && (this.x - enemy.x >= 0) && (this.x - enemy.x <= this.speed) && (!enemy.isShielded) ) );
    // Если было найдено совпадение - обрабатываем
    // Иначе отрисовываем пулю
    if (findEnemy) { 
      findEnemy.hp -= this.dmg;
      bullets.splice(bullets.indexOf(this), 1);
      // Если hp самолета < 1 - удаляем
      // Иначе вешаем щит
      if (findEnemy.hp <= 0) {
        incKills(findEnemy);
        if (findEnemy.isBoss) completeBossStage();
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
    this.dmg = 1 + kLvl;
    this.speed = 50;
  }
}

// Подкласс для снарядов из ракетницы
class Rocket extends Bullet {
  constructor(x, y) {
    super(x, y);
    this.dmg = 3 + 2*kLvl;
    this.speed = 20;
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
    if (isPaused) return false;

    ctx.clearRect(0, 0, 1920*2, 1080);

    ctx.drawImage(clouds_1, vx, 0);
    ctx.drawImage(clouds_2, vx, 0);
    ctx.drawImage(clouds_3, vx, 0);
    ctx.drawImage(clouds_4, vx, 0);
    ctx.drawImage(clouds_1, vx+1920, 0);
    ctx.drawImage(clouds_2, vx+1920, 0);
    ctx.drawImage(clouds_3, vx+1920, 0);
    ctx.drawImage(clouds_4, vx+1920, 0);

    ctx.font = "30px Arial";
    ctx.fillText(`🏅: ${scoreCount}`, 20, 50);
    ctx.fillText(`❤️: ${livesCount}`, 20, 120, 100);
    ctx.fillText(`🚀: ${rocketsCount}`, 120, 120, 100);
    if (isBossStage) ctx.fillText(`Boss stage!`, 220, 120);

    player.draw();

    // Если hp игрока < 1 - конец игры
    if (livesCount <= 0) {
      let inner = `<h1>Введите ваше имя:</h1>\
                    <span>${scoreCount} очков</span>\
                    <input type="text">\
                    <button class="popupBtn" type="submit" onclick="addResult()">Отправить</button>`;
      showPopup(gameboard, inner);
      clearInterval(renderTimer);
    }

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
      if (el.x <= -el.width) {
        // Если игрок не под щитом - вычитаем урон
        if (!player.isShielded) changeLives(-el.dmg);
        player.shield();
        enemies.splice(enemies.indexOf(el), 1);
      }
    })

    vx -= 2;
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
    if ( (isPaused) || (isBossStage) ) return false;
    let y = Math.round(Math.random() * (canvas.height - 150) + 75);
    let enemy;
    let num = Math.random();
    switch (levelsCount) {
      case (0):
        enemy = new EnemyPlane(canvas.width, y);
        break;
      case (1):
        if ( (num >= 0) && (num <= 0.25) ) enemy = new HeavyEnemyPlane(canvas.width, y);
        else if ( (num >= 0.25) && (num <= 0.5) ) enemy = new EliteEnemyPlane(canvas.width, y);
        else enemy = new EnemyPlane(canvas.width, y);
        break;
      case (2):
        if ( (num >= 0) && (num <= 0.25) ) enemy = new HeavyEnemyPlane(canvas.width, y);
        else if ( (num >= 0.25) && (num <= 0.75) ) enemy = new EliteEnemyPlane(canvas.width, y);
        else enemy = new EnemyPlane(canvas.width, y);
        break;
      case (3):
        if ( (num >= 0) && (num <= 0.25) ) enemy = new HeavyEnemyPlane(canvas.width, y);
        else enemy = new EliteEnemyPlane(canvas.width, y);
        break;
      default:
        if ( (num >= 0) && (num <= 0.5) ) enemy = new HeavyEnemyPlane(canvas.width, y);
        else enemy = new EliteEnemyPlane(canvas.width, y);
        break;
    }
    enemies.push(enemy);
  }, spawnTime);
}

// Изменение счета
function incScore(value) {
  scoreCount += value;
  if ( (Math.floor(scoreCount / 1000) > levelsCount) && (!isBossStage) ) startBossStage();
}

// Изменение количества жизней
function changeLives(value) {
  livesCount += value;
}

// Повышение уровеня
function incLevel() {
  levelsCount += 1;
  kLvl = Math.pow(levelsCount, 2);
  isBossStage = !isBossStage;
}

// Изменение количества рокет
function changeRockets(value) {
  rocketsCount += value;
}

// Изменение количества убитых врагов
function incKills(el) {
  incScore(el.value);
  enemies.splice(enemies.indexOf(el), 1);
  killsCount += 1;
  if (killsCount % 10 == 0) changeRockets(5);
}

// Начало босс-стадии уровня
function startBossStage() {
  let enemy = new Boss();
  enemies.push(enemy);
  isBossStage = !isBossStage;
}

// Завершение босс-стадии уровня
function completeBossStage() {
  incLevel();
}


const clouds_1 = new Image(); clouds_1.src = './assets/game_background_1/layers/clouds_1.png';
const clouds_2 = new Image(); clouds_2.src = './assets/game_background_1/layers/clouds_2.png';
const clouds_3 = new Image(); clouds_3.src = './assets/game_background_1/layers/clouds_3.png';
const clouds_4 = new Image(); clouds_4.src = './assets/game_background_1/layers/clouds_4.png';

const player_img = new Image(); player_img.src = './assets/Plane/Fly(1).png';
const enemy_img = new Image(); enemy_img.src = './assets/Plane/Flying_Enemy(1).png';
const elite_enemy_img = new Image(); elite_enemy_img.src = './assets/Plane/Flying_Enemy_Elite(1).png';
const heavy_enemy_img = new Image(); heavy_enemy_img.src = './assets/Plane/Flying_Enemy_Heavy(1).png';
const boss_img = new Image(); boss_img.src = './assets/Plane/Flying_Enemy_Boss(1).png';

const gun_img = new Image(); gun_img.src = './assets/Bullet/Bullet(1).png';
const rocket_img = new Image(); rocket_img.src = './assets/Bullet/Missile(1).png';

// Начинаем игру после загрузки изображений
if ( document.images ) {
  startGame()
}

function startGame() {
  renderGame();
  addEnemy();
}

const player = new Player(10, CENTER, player_img);

canvas.addEventListener('mousemove', e => {
  if (isPaused) return false;
  let bounds  = canvas.getBoundingClientRect();
  let mouseY = e.clientY - bounds.top - scrollY - player.height/2;
  if (canvas.height - mouseY <  60) mouseY = canvas.height - 60;
  else if (mouseY < 0) mouseY = 0;
  player.move(mouseY);
})

canvas.addEventListener('mousedown', e => {
  if (isPaused) return false;
  if (canvas.height - player.y <  60) 
    mouseY = canvas.height - 40;
  // Если была нажата левая кнопка мыши - вызываем shoot от 0
  // Иначе вызываем shoot от 1
  changeCursor();
  if (detectLeftButton(e)) {
    player.shoot(player.y + 30, 0)
    shootCounter = setInterval(() => player.shoot(player.y + 30, 0), 200);
  }
  else player.shoot(player.y, 1);
})

canvas.addEventListener('mouseup', () => {
  clearInterval(shootCounter);
})

canvas.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', e => {
  if (e.which == 32) isPaused = !isPaused;
});

// Вспомогательная функция для определения типа нажатой клавиши мыши
function detectLeftButton(e) {
   if ('buttons' in e) {
      return e.buttons === 1;
  } else if ('which' in e) {
      return e.which === 1;
  } else {
      return (e.button == 1 || e.type == 'click');
  }
}

// Вспомогательная функция для изменения цвета курсора при клике
function changeCursor() {
  cursor.style = "cursor: url('./assets/Cursor/crosshair_hit.png'), pointer";
  setTimeout(() => {cursor.style = "cursor: url('./assets/Cursor/crosshair.png'), pointer;"}, 100 );
}

// Вспомогательная функция для отображения модального окна
function showPopup(parent, inner) {
  let popUp = document.createElement('div');
  popUp.className = 'popup';
  popUp.innerHTML = inner;
  parent.insertBefore(popUp, parent.childNodes[0]);
}

// Вспомогательная функция для получения данных из модального окна
function addResult() {
  let name = document.getElementsByTagName('input')[0].value;
  if (name == undefined) return false;
  localStorage.setItem(name, scoreCount);
  closePopup(gameboard);
  showLeaderBoard();
}

// Вспомогательная функция для закрытия модального окна
function closePopup(parent) {
  if (parent == undefined) parent = gameboard;
  let popUp = parent.getElementsByClassName('popup')[0];
  parent.removeChild(popUp);
}

// Вспомогательная функция для отображения таблицы рекордов
function showLeaderBoard() {
  let lsArr = getSortedLocalStorage();
  let inner = '<h1>Таблица рекордов:</h1>\
              <table>\
              <tr>\
              <th>Name</th>\
              <th>Score</th>\
              </tr>';

  // Выводим топ-10 результатов
  for (let i = 0; i < 10; i++) {
    let medal = '';
    switch (i) {
      case(0): 
        medal = '🥇 ';
        break;
      case(1):
        medal = '🥈 ';
        break;
      case(2):
        medal = '🥉 ';
        break;
    }

    if (lsArr[i] == undefined) continue;
    inner += `<tr>\
              <td class="name">${medal}${lsArr[i].name}</td>\
              <td class="score">${lsArr[i].score}</td>\
              </tr>`
  }
  inner += '</table>\
            <button class="popupBtn" type="submit" onclick="{closePopup(); restartGame()}">Начать заново</button>';
  showPopup(gameboard, inner);
}

// Вспомогательная функция для получения записей в localstorage в виде отсортированного по неубыванию массива
function getSortedLocalStorage() {
  let localStorageArr = [];

  // Заполняем массив записями из localstorage
  for (let i = 0; i < localStorage.length; i++)
    localStorageArr.push( {name: localStorage.key(i), score: localStorage.getItem(localStorage.key(i))} );

  // Умопормачительная магия сортировки пузырьком
  for (let i = 0; i < localStorage.length ; i++)
    for (let j = 0; j < localStorage.length; j++)
      if ( parseInt(localStorageArr[i].score) > parseInt(localStorageArr[j].score) ) {
        let temp = localStorageArr[i];
        localStorageArr[i] = localStorageArr[j];
        localStorageArr[j] = temp;
      }
  return localStorageArr;
}

// Единственное, что я не придумал - как при рестарте игры по-другому обнулять переменные
// При этом убирать их из начала кода я тоже не хочу, т.к. настройки должны быть на видном месте!
// Поэтому я просто скопировал код сверху и вынес это в отдельные функции, чтобы не так позорно было
function restartGame() {
  clearInterval(renderTimer);
  clearInterval(spanwTimer);
  ctx.clearRect(0, 0, 1920*2, 1080);
  updateStats();
  startGame();
}

function updateStats() {
  scoreCount = 0;           // Счетчик очков
  livesCount = 5;           // Счетчик жизней
  levelsCount = 0;          // Счетчик уровней
  rocketsCount = 10;        // Счетчик рокет
  killsCount = 0;           // Счетчик убитых врагов
  vx = 0;                   // Отклонение по x
  kLvl = 0;                 // Коэффициент для усиления вражеских юнитов
  isPaused = false;         // Поставлена ли игра на паузу
  isBossStage = false;      // Находится ли уровень на стадии босса
  bullets = [];
  enemies = [];
}