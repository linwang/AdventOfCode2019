class Logging
{
    constructor(on)
    {
        this.on = on;
    }
    logMe(message)
    {
        if(this.on) console.log(message);
    }
    popErr(message)
    {
       if(this.on) window.alert(message);
    }
}
var log = new Logging(false);
//Runs the program using a phase setting 
//and an optional input signal from a previous program 
//and returns its current output
function processIntCodeProgram(program, phaseSetting, inputSignal, pos, relBase)
{
    program.writePos = function (mode, pos)
    {
        if(mode === 1)//immediate mode
                window.alert("INVALID MODE " + mode);
        else if (mode === 2)//relative mode
                return this.getValue(pos) + this.relBase;
        else//position mode
                return this.getValue(pos);
    }

    program.readValue = function (mode, pos)
    {
        var value;
        if(mode === 1)//immediate mode
            value = this.getValue(pos);
        else if (mode === 2)//relative mode
            value = this.getValue(this.getValue(pos) + this.relBase);
        else//position mode
            value = this.getValue(this.getValue(pos));
        if(value === undefined)
            throw "failed to read value at " + pos + " with mode " + mode;
        return value;
    }
    program.fillToLength = function (length)
    {
        var curLen = this.length;
        if(length > curLen)
        {
            this.length = length;
            this.fill(0, curLen, length);
        }
    };
    program.getValue = function (pos)
    {   
        this.fillToLength(pos + 1);
        return this[pos];
    };
    program.setValue = function (pos, value)
    {
        this.fillToLength(pos + 1);
        this[pos] = value;
    };

    var readPhase = false, readInput = false;
    //program already read the phase setting
    if(phaseSetting === undefined)
        readPhase = true;
    phaseSetting = parseInt(phaseSetting);

    //inputSignal is optional
    if(inputSignal === undefined)
    {
        inputSignal = 0;
        readInput = true;
    }
    else
        inputSignal = parseInt(inputSignal);

    //pos is optional
    if(pos === undefined)
        pos = 0;
    pos = parseInt(pos);

    //relBase is optional
    if(relBase === undefined)
        relBase = 0;
    program.relBase = relBase;

    var instruction = 0;
    var param1Mode = 0, param2Mode = 0;
    var param1 = 0, param2 = 0, param3 = 0;

    var outputVal = 0;
    var output = {pos: 0, isFinished: false, program:undefined, readPhase:false, outputs:[], relBase:0};

    while(pos < program.length)
    {
        instruction = program.getValue(pos)%100;
        param1Mode = Math.floor(program.getValue(pos)%1000/100);
        param2Mode = Math.floor(program.getValue(pos)%10000/1000);
        param3Mode = Math.floor(program.getValue(pos)%100000/10000);
        log.logMe("I " + program.getValue(pos) + " at position " + pos);             

        switch(instruction)
        {
            case 1: //sum 
            param1 = program.readValue(param1Mode, pos+1);
            param2 = program.readValue(param2Mode, pos+2);
            program.setValue(program.writePos(param3Mode, pos+3), param1 + param2);
            log.logMe(param1 + " + " + param2 + " = " + program.getValue(program.writePos(param3Mode, pos+3)));
            pos += 4;
            break; 
            case 2: //multiply
            param1 = program.readValue(param1Mode, pos+1);
            param2 = program.readValue(param2Mode, pos+2);
            program.setValue(program.writePos(param3Mode, pos+3), param1 * param2);
            log.logMe(param1 + " * " + param2 + " = " + program.getValue(program.writePos(param3Mode, pos+3)));
            pos += 4;
            break;
            case 3: //write inputs to
            param1 = program.writePos(param1Mode, pos+1);
            if(!readPhase)
            {
                program.setValue(param1, phaseSetting);
                readPhase = true;
            }
            else if(!readInput)
            {
                program.setValue(param1, inputSignal);
                readInput = true;
            }
            else
            {
                output.pos = pos;
                output.readPhase = readPhase;
                output.isFinished = false;
                output.program = program.slice(0);
                output.relBase = program.relBase;
                return output;
            }
            log.logMe("Saved input: " + program.getValue(param1) + " at " + param1);
            pos += 2;
            break;
            case 4: //set output location
                outputVal = program.readValue(param1Mode, pos + 1);
                output.outputs.push(outputVal);
            log.logMe("Set output value to : " + outputVal);
            pos += 2;
            break;
            case 5://jump-if-true
            param1 = program.readValue(param1Mode, pos+1);
            param2 = program.readValue(param2Mode, pos+2);
            if(param1 !== 0)
                pos = param2;
            else
                pos += 3;
            log.logMe("jump-if-true" + param1 +", param2 = " + param2 + ", jumps to " + pos);
            break;
            case 6://jump-if-false
            param1 = program.readValue(param1Mode, pos+1);
            param2 = program.readValue(param2Mode, pos+2);
            if(param1 === 0)
                pos = param2;
            else
                pos += 3;
                log.logMe("jump-if-false" + param1 +", param2 = " + param2 + ", jumps to " + pos);
            break;
            case 7://less than
            param1 = program.readValue(param1Mode, pos+1);
            param2 = program.readValue(param2Mode, pos+2);
            param3 = program.writePos(param3Mode, pos+3);
            if(param1 < param2)
                program.setValue(param3, 1);
            else
                program.setValue(param3, 0);
            log.logMe(param1 + " < " + param2 + " set value " + program.getValue(param3) + " at " + program.writePos(param3Mode, pos+3));
            pos += 4;
            break;
            case 8://equal
            param1 = program.readValue(param1Mode, pos+1);
            param2 = program.readValue(param2Mode, pos+2);
            param3 = program.writePos(param3Mode, pos+3);
            if(param1 === param2)
                program.setValue(param3, 1);
            else
                program.setValue(param3, 0);
            log.logMe(param1 + " === " + param2 + " set value " + program.getValue(param3)+ " at " + program.writePos(param3Mode, pos+3));
            pos += 4;
            break;
            case 9://relative base offset
            param1 = program.readValue(param1Mode, pos+1);
            program.relBase += param1; 
            log.logMe(param1 + " relative base is " + program.relBase);
            pos += 2;
            break;
            case 99:                  
            output.isFinished = true;
            log.logMe("output value " + output.outputs);
            log.logMe("output prog: " + program);
            return output;
            break;
            default:
            throw "Cannot understand instruction " + instruction + " at position " + pos;
            return undefined;
        }
    }
}
function runProgramOn(program, inputs)
{
    //DOES not return intermittent outputs
    //they're fed back into the program instead
    var output;
    var outputs = [];
    var totalFinished = 0;
    while(totalFinished < inputs.length)
    {
        for(var i = 0; i  < inputs.length; i++)
        {
            if(outputs.length < inputs.length)//start running program on each amplifier
            {
                output = processIntCodeProgram(program.slice(0), inputs[i], output === undefined ? 0:output.outputs[0]);
                outputs.push(output);
            }
            else
            {
                output = processIntCodeProgram(outputs[i].program, outputs[i].readPhase ? undefined:inputs[i], output.outputs[0]/*previous output*/, outputs[i].pos);
                outputs[i] = output;
            }
            if(output.outputs.length > 0)
                log.logMe("outputs: " + output.outputs);
            if(outputs[i].isFinished)
                totalFinished++;
        }
    }
    return output.outputs[0];
}
class Coordinate {
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }
    toString()
    {
        return "[" + this.x + ", " + this.y + "]";
    }
    add(point)
    {
        var x = this.x + point.x;
        var y = this.y + point.y;
        return new Coordinate(x, y);
    }
    minus(point)
    {
        var x = this.x - point.x;
        var y = this.y - point.y;
        return new Coordinate(x, y);
    }
    equals(point)
    {
        var sameX = (this.x === point.x);
        var sameY = (this.y === point.y);

        return (sameX && sameY);
    }
    static parse(input)
    {
        let str = input.trim();
        str = str.substring(1, str.length - 1);
        let values = str.split(',');
        let x = parseInt(values[0]);
        let y = parseInt(values[1]);
        if(!isNaN(x) && !isNaN(y))
            return new Coordinate(parseInt(values[0]), parseInt(values[1]));
    }
}

function getLCM(numbers)
{
    if(numbers === undefined) return 0;
    if(numbers.length === 0) return 0;
    if(numbers.length === 1) return numbers[0];
    if(numbers.length === 2)
    {
        return numbers[0]*numbers[1]/getGCD(numbers);
    }
    else
    {
        let result = getLCM(numbers.slice(1));
        return getLCM([numbers[0], result]);
    }
}

function getGCD(numbers)
{
    if(numbers === undefined) return 0;
    if(numbers.length === 0) return 0;
    if(numbers.length === 1) return numbers[0];
    if(numbers.length === 2) 
    {
        let numA = numbers[0];
        let numB = numbers[1];
        if(numB === 0) return numA;
        else
        {
            return getGCD([numB, numA%numB]);
        }
    }
   else
   {
        let result = getGCD(numbers.slice(1));
        return getGCD([numbers[0], result]);
   }
}

class Board {
    constructor(initColorCode, initLoc, defaultColorCode, colorDecoder)
    {
        this.list = {};
        if((initColorCode !== undefined) && (initLoc !== undefined))
        {
            this.list[initLoc.toString()] = initColorCode;
            this.min = new Coordinate(initLoc.x, initLoc.y);
            this.max = new Coordinate(initLoc.x, initLoc.y);
        }
        else
        {
            this.min = new Coordinate(0, 0);
            this.max = new Coordinate(0, 0);
        }
        if(defaultColorCode !== undefined)
            this.defaultColorCode = defaultColorCode;
        else
            this.defaultColorCode = 0;

        this.colorDecoder = colorDecoder;
    }
    getValue(location)
    {
        var colorCode = this.list[location.toString()];
        if(colorCode === undefined)
            colorCode = this.defaultColorCode;
        return colorCode;
    }
    setValue(location, colorCode)
    {
        this.list[location.toString()] = colorCode;
        if(location.x > this.max.x)
        {
            this.max.x = location.x;
        }
        if(location.x < this.min.x)
        {
            this.min.x = location.x;
        }
        if(location.y > this.max.y)
        {
            this.max.y = location.y;
        }
        if(location.y < this.min.y)
        {
            this.min.y = location.y;
        }
    }
    draw(colorDecoder)
    {
        if(colorDecoder !== undefined) this.colorDecoder = colorDecoder;
        if(this.colorDecoder === undefined) return "";
        var html = "<table>";
        var color = "", colorCode;
        for(var y = this.min.y; y <= this.max.y; y++)
        {
            html += "<tr>";
            for(var x = this.min.x; x <= this.max.x; x++)
            {
                colorCode = this.getValue(new Coordinate(x, y));
                color = this.colorDecoder(colorCode);
                if(color === undefined)
                    html += "<td>" + colorCode + "</td>";
                else
                    html += "<td bgcolor = " + color + " style = 'color:" + color + "'>" + colorCode + "</td>";
            }
            html += "</tr>";
        }
        html += "</table>";

        return html;
    }
    update(list){
        if(list === undefined) return;
        let count = list.length;
        if(count === 0) return;
        if((list[0].location !== undefined) && (list[0].type !== undefined))
        {
            for(let item of list)
            {
                this.setValue(item.location, item.type);
            }
        }
        else
        {
            for(let i = 0; i < count; i = i + 3)
            {
                this.setValue(new Coordinate(list[i], list[i+1]), list[i+2]);
            }
        }
    }
    clear()
    {
        this.list = {};
        this.min = new Coordinate(0, 0);
        this.max = new Coordinate(0, 0);
        this.defaultColorCode = 0;
        this.colorDecoder = undefined;
    }
}
class Node
    {
        constructor(name)
        {
            this.name = name;
            this.children = [];
        }
        addChild(child)
        {
            this.children.push(child);
        }
        find(name, pathToYou)
        {
            if(pathToYou === undefined) pathToYou = [];
            var child, found;
            for(child of this.children)
            {
                if(child === undefined) return;
                if(child.name === name) 
                {
                    pathToYou.push(child.name);
                    return child;
                }
                else
                {
                    found = child.findChild(name, pathToYou);
                    if(found != undefined)
                    {
                        pathToYou.push(child.name);
                        return found;
                    }
                }
            }
        }
        findAll(formula)
        {
            var nodes = [], childNodes = [];
            if(formula(this.name)) 
                nodes.push(this.name);
            for(var child of this.children)
            {
                childNodes = child.findAll(formula);
                if(childNodes.length > 0) 
                    nodes = nodes.concat(childNodes);
            }
            return nodes;
        }
        toString()
        {
            var str = this.name.toString();
            var child;
            for(child of this.children)
            {
                str += child.toString();
            }
            return str;
        }
    }
class Tree
{
    constructor(root)
    {
        this.root = root;
    }
    get children()
    {
        return this.root.children;
    }
    get name()
    {
        return this.root.name;
    }
    addChild(node)
    {
        this.root.addChild(node);
    }
    findChild(name, pathToYou)
    {
        return this.root.findChild(name, pathToYou);
    }
    toString()
    {
        return this.root.toString();
    }
}
class IntCodeMachine {
    constructor(program)
    {
        this.program = program;
        this.state = {pos: 0, isFinished: false, outputs:[], relBase:0};
    }
    run(inputs)
    {
        var pos = this.state.pos;
        var relBase = this.state.relBase;
        var inputCounter = 0;
        var newState = {pos: 0, isFinished: false, outputs:[], relBase:0};

        this.program.writePos = function (mode, pos)
        {
            if(mode == 1)//immediate mode
                    window.alert("INVALID MODE " + mode);
            else if (mode == 2)//relative mode
                    return this.getValue(pos) + this.relBase;
            else//position mode
                    return this.getValue(pos);
        }

        this.program.readValue = function (mode, pos)
        {
            var value;
            if(mode == 1)//immediate mode
                value = this.getValue(pos);
            else if (mode == 2)//relative mode
                value = this.getValue(this.getValue(pos) + this.relBase);
            else//position mode
                value = this.getValue(this.getValue(pos));
            if(value === undefined)
                throw "failed to read value at " + pos + " with mode " + mode;
            return value;
        }
        this.program.fillToLength = function (length)
        {
            var curLen = this.length;
            if(length > curLen)
            {
                this.length = length;
                this.fill(0, curLen, length);
            }
        };
        this.program.getValue = function (pos)
        {   
            this.fillToLength(pos + 1);
            return this[pos];
        };
        this.program.setValue = function (pos, value)
        {
            this.fillToLength(pos + 1);
            this[pos] = value;
        };

        if(inputs === undefined) 
            inputs = [];

        //pos is optional
        if(pos == undefined)
            pos = 0;
        pos = parseInt(pos);

        //relBase is optional
        if(relBase === undefined)
            relBase = 0;
        this.program.relBase = relBase;

        var instruction = 0;
        var param1Mode = 0, param2Mode = 0, param3Mode = 0;
        var param1 = 0, param2 = 0, param3 = 0;

        var outputVal = 0;
        

        while(pos < this.program.length)
        {
            instruction = this.program.getValue(pos)%100;
            param1Mode = Math.floor(this.program.getValue(pos)%1000/100);
            param2Mode = Math.floor(this.program.getValue(pos)%10000/1000);
            param3Mode = Math.floor(this.program.getValue(pos)%100000/10000);
            log.logMe("I " + this.program.getValue(pos) + " at position " + pos);             

            switch(instruction)
            {
                case 1: //sum 
                param1 = this.program.readValue(param1Mode, pos+1);
                param2 = this.program.readValue(param2Mode, pos+2);
                this.program.setValue(this.program.writePos(param3Mode, pos+3), param1 + param2);
                log.logMe(param1 + " + " + param2 + " = " + this.program.getValue(this.program.writePos(param3Mode, pos+3)));
                pos += 4;
                break; 
                case 2: //multiply
                param1 = this.program.readValue(param1Mode, pos+1);
                param2 = this.program.readValue(param2Mode, pos+2);
                this.program.setValue(this.program.writePos(param3Mode, pos+3), param1 * param2);
                log.logMe(param1 + " * " + param2 + " = " + this.program.getValue(this.program.writePos(param3Mode, pos+3)));
                pos += 4;
                break;
                case 3: //write inputs to
                param1 = this.program.writePos(param1Mode, pos+1);
                if (inputCounter < inputs.length){
                    this.program.setValue(param1, inputs[inputCounter]);
                    inputCounter++;
                }
                else
                {
                    newState.pos = pos;
                    newState.isFinished = false;
                    newState.relBase = this.program.relBase;
                    this.state = newState;
                    return this.state;
                }
                log.logMe("Saved input: " + this.program.getValue(param1) + " at " + param1);
                pos += 2;
                break;
                case 4: //set output location
                    outputVal = this.program.readValue(param1Mode, pos + 1);
                    newState.outputs.push(outputVal);
                log.logMe("Set output value to : " + outputVal);
                pos += 2;
                break;
                case 5://jump-if-true
                param1 = this.program.readValue(param1Mode, pos+1);
                param2 = this.program.readValue(param2Mode, pos+2);
                if(param1 !== 0)
                    pos = param2;
                else
                    pos += 3;
                log.logMe("jump-if-true" + param1 +", param2 = " + param2 + ", jumps to " + pos);
                break;
                case 6://jump-if-false
                param1 = this.program.readValue(param1Mode, pos+1);
                param2 = this.program.readValue(param2Mode, pos+2);
                if(param1 === 0)
                    pos = param2;
                else
                    pos += 3;
                    log.logMe("jump-if-false" + param1 +", param2 = " + param2 + ", jumps to " + pos);
                break;
                case 7://less than
                param1 = this.program.readValue(param1Mode, pos+1);
                param2 = this.program.readValue(param2Mode, pos+2);
                param3 = this.program.writePos(param3Mode, pos+3);
                if(param1 < param2)
                    this.program.setValue(param3, 1);
                else
                    this.program.setValue(param3, 0);
                log.logMe(param1 + " < " + param2 + " set value " + this.program.getValue(param3) + " at " + this.program.writePos(param3Mode, pos+3));
                pos += 4;
                break;
                case 8://equal
                param1 = this.program.readValue(param1Mode, pos+1);
                param2 = this.program.readValue(param2Mode, pos+2);
                param3 = this.program.writePos(param3Mode, pos+3);
                if(param1 === param2)
                    this.program.setValue(param3, 1);
                else
                    this.program.setValue(param3, 0);
                log.logMe(param1 + " == " + param2 + " set value " + this.program.getValue(param3)+ " at " + this.program.writePos(param3Mode, pos+3));
                pos += 4;
                break;
                case 9://relative base offset
                param1 = this.program.readValue(param1Mode, pos+1);
                this.program.relBase += param1; 
                log.logMe(param1 + " relative base is " + this.program.relBase);
                pos += 2;
                break;
                case 99:                  
                newState.isFinished = true;
                log.logMe("output value " + newState.outputs);
                log.logMe("output prog: " + this.program);
                this.state = newState;
                return this.state;
                break;
                default:
                throw "Cannot understand instruction " + instruction + " at position " + pos;
            }
        }
    }
}
function wait(ms) {
    var start = Date.now(),
        now = start;
    while (now - start < ms) {
    now = Date.now();
    }
}
class Droid
{
    constructor(machine, objectTypes, directions){
        this.position = new Coordinate(0, 0);
        this.machine = machine;
        this._objectTypes = objectTypes;
        this._directions = directions;
    }
    getDirections()
    {
        return this._directions;
    }
    getTypes()
    {
        return this._objectTypes;
    }
    getPathType()
    {
        return this._objectTypes.path;
    }
    getWallType()
    {
        return this._objectTypes.wall;
    }
    decodeDirection(dirCode)
    {
        let key;
        let directions = this.getDirections();
        for(key in directions)
        {
            if(directions[key] === dirCode)
                return key;
        }
    }
    calcNew(position, dirCode)
    {
        let deltas = {north:{x:0, y:-1}, south:{x:0, y:1}, west:{x:-1, y:0}, east:{x:1, y:0}};
        let direction = this.decodeDirection(dirCode);
        let dirDelta = deltas[direction];
        let newPosition = position.add(dirDelta);
        return newPosition;
    }
    run(inputs)
    {
        if(this.machine === undefined)
            return;
        let programOutput = this.machine.run(inputs);
        return programOutput;
    }
}
class DroidDriver
{
    constructor(droid, map = {})
    {
        if(droid === undefined)
            throw "must define droid!";
        this._droid = droid;
        let pathType = droid.getPathType();
        let wallType = droid.getWallType();
        if(pathType === undefined)
            throw "must define path type!";
        this._pathType = pathType;
        if(wallType === undefined)
            throw "must define wallType!";
        this._wallType = wallType;
        this._map = map;
        //this._map[droid.position.toString()] = {type:pathType, count:1};
        this._availDirections = [];
        let directions = droid.getDirections();
        for(let dir in directions)
        {
            this._availDirections.push(directions[dir]);
        }
        this._dirIndex = 0;
    }
    updateMap(list)
    {
        if(list === undefined) 
            return;
        let item, secondChoiceInput, locString;
        for(item of list)
        {
            locString = item.location.toString();
            if((item.type === this._pathType) || (item.type === this._wallType))
            {
                if(this._map[locString] === undefined)
                    this._map[locString] = {type:item.type, count:0};
                else
                {
                    this._map[locString].count++;
                }
                    
            }
        }
    }
    getNextDirection(isAllowExplore = true)
    {
        let smallestCount = {count:Infinity, dirIndex:0};
        let totalDirections = this._availDirections.length;
        for(let i = 0; i < totalDirections; i++)
        {
            this._dirIndex = (this._dirIndex + 1) % totalDirections;
            let newPosition = this._droid.calcNew(this._droid.position, this._availDirections[this._dirIndex]).toString();
            if((this._map[newPosition] === undefined) && isAllowExplore)//if new input goes to an unexplored space, return
            {
                return this._availDirections[this._dirIndex];
            }
            else if(this._map[newPosition].type !== this._wallType)
            //if new input does not go to a wall, track input
            {
                if(this._map[newPosition].count < smallestCount.count)
                {
                    smallestCount.count = this._map[newPosition].count;
                    smallestCount.dirIndex = this._dirIndex;
                }
            }
        }
        this._dirIndex = smallestCount.dirIndex;
        return this._availDirections[this._dirIndex];
    }
}
function isUpperCaseLetter(char)
{
    return (/[A-Z]/).test(char);
}
function isLowerCaseLetter(char)
{
    return (/[a-z]/).test(char);
}
