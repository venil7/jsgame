!(function(fabric, _, io) {

  var fps = 1000 / 60;
  fabric.Object.prototype.selectable = false;
  var Util = {
    now: function() {
      return(new Date()).getTime();
    },
    random: function(from, to) {
      return Math.floor((Math.random() * to) + from);
    },
    positive: function(n) {
      return parseInt(n, 10) > 0;
    },
    path: function(x0, y0, x1, y1) {
      var dx = Math.abs(x1 - x0);
      var dy = Math.abs(y1 - y0);
      var sx = (x0 < x1) ? 1 : -1;
      var sy = (y0 < y1) ? 1 : -1;
      var err = dx - dy;
      var result = [];
      while((x0 != x1) && (y0 != y1)) {
        result.push({
          'left': x0,
          'top': y0
        });
        var e2 = 2 * err;
        if(e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if(e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }
      return result;
    },
    remove: function(a,from,to) {
      var rest = a.slice((to || from) + 1 || a.length);
      a.length = from < 0 ? a.length + from : from;
      return a.push.apply(a, rest);
    },
    del: function(a, el) {
      var index = a.indexOf(el);
      return index >= 0 ? this.remove(a,index) : a;
    }
  };
  var Key = {
    _pressed: {},
    LEFT: 65,//37,
    UP: 87,//38,
    RIGHT: 68,//39,
    DOWN: 83,//40,
    SPACE: 32,
    isDown: function(keyCode) {
      return this._pressed[keyCode];
    },
    onKeydown: function(event) {
      //console.log('keydown');
      this._pressed[event.keyCode] = Util.now();
    },
    onKeyup: function(event) {
      //console.log('keyup');
      delete this._pressed[event.keyCode];
    }
  };

  //////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////
  var Unit = function(name, opts, game) {
      if(!name) return;
      var elem = document.getElementById(name);
      this.initialize(elem, opts);
      this.width = this.getWidth();
      this.height = this.getHeight();
      this.game = game;
    };
  Unit.prototype = new fabric.Image({
    width: 0,
    height: 0
  });
  Unit.prototype.constructor = fabric.Image;
  Unit.prototype.move = function(dir, step, duration) {
    var opt = {
      'duration': duration || 1
    };
    step = step || 2;
    var inc = '+' + step;
    var dec = '-' + step;
    switch(dir.toLowerCase()) {
    case 'up':
      this.animate('top', dec, opt);
      break;
    case 'down':
      this.animate('top', inc, opt);
      break;
    case 'left':
      this.animate('left', dec, opt);
      break;
    case 'right':
      this.animate('left', inc, opt);
      break;
    }
  };

  Unit.prototype.update = function() {
      if(this.get('top') < 0) 
        this.set('top', this.teleport ? this.game.height : 0);
      if(this.get('top') > this.game.height) 
        this.set('top', this.teleport ? 0 : this.game.height);
      if(this.get('left') < 0) 
        this.set('left', this.teleport ? this.game.width : 0);
      if(this.get('left') > this.game.width) 
        this.set('left', this.teleport ? 0 : this.game.width);
  };

  Unit.prototype.pop = function(to, scale) {
    var that = this;
    to = to || 1;
    scale = scale || 1.2;
    this.scale(scale);
    setTimeout(function() {
      that.scale(1);
    }, to);
  };

  Unit.prototype.moveTo = function(x1, y1, timeout) {
    var that = this;
    timeout = timeout || 0;
    clearTimeout(that.handle);
    var x0 = this.get('left');
    var y0 = this.get('top');
    var path = Util.path(x0, y0, x1, y1);
    var func = function() {
        var coord = path.shift();
        if(coord) {
          that.set('top', coord.top);
          that.set('left', coord.left);
          that.setCoords();
          that.handle = setTimeout(func, timeout);
        }
      };
    that.handle = setTimeout(func, timeout);
  };

  Unit.prototype.toObj = function(){
    return this.toObject(['top','left']);
  };

  //////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////
  var Star = function(name, opts, game) {
      if(!name) return;
      this.constructor(name, opts, game);
      this.popTime = Util.random(60, 240);
      this.updateTime = 0;
    };
  Star.prototype = new Unit();
  Star.prototype.constructor = Unit;
  Star.prototype.update = function() {
    // super
    this.constructor.prototype.update.call(this);
    // Unit.prototype.update.call(this);
    // override
    this.updateTime += 1;
    if (this.updateTime >= this.popTime) {
      this.updateTime = 0;
      this.pop();
    }
    var dir = ['up','down','left','right'][Util.random(0,4)];
    this.move(dir,5,200);
  };
  Star.prototype.pop = function() {
    this.constructor.prototype.pop.call(this, 300, 0.7);
  };

  var Bullet = function(dest, opts, game) {
      if(!dest) return;
      var name= "bullet";
      this.constructor(name, opts, game);
      this.dest = dest;
    };
  Bullet.prototype = new Unit();
  Bullet.prototype.constructor = Unit;
  Bullet.prototype.update = function() {
    this.constructor.prototype.update.call(this);
    var dest = this.dest;
    var x = this.get('left');
    var y = this.get('top');
    if(Math.abs(x - dest.x)<=2&&Math.abs(y - dest.y)<=2) {
      this.fire("game:bullet:destination", this);
    } else {
      this.moveTo(dest.x, dest.y, 0);
    }
  };

  //////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////
  var Player = function(name, opts, game) {
      if(!name) return;
      this.constructor(name, opts, game);
      this.teleport = true;
    };
  Player.prototype = new Unit();
  Player.prototype.constructor = Unit;
  Player.prototype.update = function() {
    // super
    //Unit.prototype.update.call(this);
    this.constructor.prototype.update.call(this);
    //override
    if(Key.isDown(Key.UP)) this.move('up');
    if(Key.isDown(Key.LEFT)) this.move('left');
    if(Key.isDown(Key.DOWN)) this.move('down');
    if(Key.isDown(Key.RIGHT)) this.move('right');
    if(Key.isDown(Key.SPACE)) this.pop();
  };

  var Monster = function(game) {
      if(game) return;
      var name = "monster";
      var opts = {
       top: Util.random(0, game.height),
       left: Util.random(0, game.width)
      };
      this.constructor(name, opts, game);
    };
  Monster.prototype = new Unit();
  Monster.prototype.constructor = Unit;
  Monster.prototype.update = function() {
    // super
    this.constructor.prototype.update.call(this);
    //override
    var top = this.get('top');
    var left = this.get('left');
  };

  //////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////
  var Game = function(id) {
      this.canvas = new fabric.Canvas(id, {
        intercative: false,
        renderOnAddition: false,
        selection: false
      });
      this.height = this.canvas.getHeight();
      this.width = this.canvas.getWidth();
    };
  Game.prototype.init = function() {
    var that = this;

    //events setup
    this.bullets = [];
    this.canvas.on('mouse:up', function(obj) {
      var o = {
        left: that.player.get('left'),
        top: that.player.get('top')
      };
      var dest = {x: obj.e.x, y:obj.e.y};
      var bullet = new Bullet(event, o, that);
      bullet.on('game:bullet:destination',function(b) {
        that.canvas.remove(b);
        Util.del(that.bullets, b);
      });
      that.bullets.push(bullet);
      that.canvas.add(bullet);
    });

    //register with sever
    this.message("connecting..");
    this.socket = io.connect();
    this.socket.on('game:start', function(obj) {
      that.player = new Player('robot1', obj, that);
      that.canvas.add(that.player);

      that.run();
    });

    this.socket.on('message', function(text) {
      that.message(text);
    });

    this.socket.on('disconnect', function() {
      that.message(text);
      console.log('disconnected..');
    });
  };
  
  Game.prototype.message = function(text, duration) {
    text = text || "";
    duration = duration || 5;//sec
    var that = this;
    if (this.msg) {
      this.canvas.remove(this.msg);
    }
    this.msg = new fabric.Text(text, {
      top: this.canvas.height / 2,
      left: this.canvas.width / 2,
      fontSize: 48,
      fontFamily: 'Offside',
      fill: '#FFFF33',
      strokeStyle: 'solid black'
    });
    this.canvas.add(this.msg);
    
    setTimeout(function(){
      that.canvas.remove(that.msg);
    }, duration*1000);
    
  };

  Game.prototype.draw = function() {
    this.canvas.renderAll();
  };

  Game.prototype.logic = function() {
    this.player.update();
    _.each(this.bullets, function(b){
      if (b) b.update();
    });
  };

  Game.prototype.run = function() {
    var that = this,
      stamp = Util.now(),
      diff;

    var run = function() {
        that.logic();
        that.draw();
        var timeout = (diff = Util.now() - stamp) >= fps ? fps : diff;
        stamp = Util.now();
        setTimeout(run, timeout);
      };
    run();
  };

  // init and run
  window.addEventListener('keyup', function(event) {
    Key.onKeyup(event);
  }, false);
  window.addEventListener('keydown', function(event) {
    Key.onKeydown(event);
  }, false);

  
  // below is a consumer code
  var g = new Game('c');
  g.init();
  //g.run();
  
  // end consumer code

})(fabric, _, io); // dependencies passed;