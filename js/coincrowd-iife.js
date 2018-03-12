var CoinCrowdQR = (function () {
'use strict';

/**
 *
 * <table width="100%">
 *     <tr>
 *         <td>
 *             <a href="https://circleci.com/gh/rendaw/qrcode-generator-es6"><img alt="Build Status" src="https://circleci.com/gh/rendaw/qrcode-generator-es6.svg?style=svg"></a>
 *         </td>
 * </table>
 *
 * @module qrcode-generator-es6
 */
//---------------------------------------------------------------------
//
// QR Code Generator for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//	http://www.opensource.org/licenses/mit-license.php
//
// The word 'QR Code' is registered trademark of
// DENSO WAVE INCORPORATED
//	http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

const PAD0 = 0xEC;
const PAD1 = 0x11;

/**
 * Displays a QR code. Set the code data with `addData` and, call `make` and then call `createSvgTag` or `createImgTag`.
 *
 * See `gallery.html` for an example.
 *
 * @param {integer} typeNumber The minimum QR code type number from 1 to 40.  Using 0 allows any QR code type number.
 * @param {String} errorCorrectionLevel 'L','M','Q','H'
 */
class qrcode {
	constructor(typeNumber, errorCorrectionLevel) {
		this._typeNumber = typeNumber;
		this._errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
		this._modules = null;
		this._moduleCount = 0;
		this._dataCache = null;
		this._dataList = [];

		this.makeImpl = (test, maskPattern) => {
			this._moduleCount = this._typeNumber * 4 + 17;
			this._modules = function(moduleCount) {
				let modules = new Array(moduleCount);
				for (let row = 0; row < moduleCount; row += 1) {
					modules[row] = new Array(moduleCount);
					for (let col = 0; col < moduleCount; col += 1) {
						modules[row][col] = null;
					}
				}
				return modules;
			}(this._moduleCount);

			this.setupPositionProbePattern(0, 0);
			this.setupPositionProbePattern(this._moduleCount - 7, 0);
			this.setupPositionProbePattern(0, this._moduleCount - 7);
			this.setupPositionAdjustPattern();
			this.setupTimingPattern();
			this.setupTypeInfo(test, maskPattern);

			if (this._typeNumber >= 7) {
				this.setupTypeNumber(test);
			}

			if (this._dataCache == null) {
				this._dataCache = this.createData(this._typeNumber, this._errorCorrectionLevel, this._dataList);
			}

			this.mapData(this._dataCache, maskPattern);
		};

		this.setupPositionProbePattern = (row, col) => {

			for (let r = -1; r <= 7; r += 1) {

				if (row + r <= -1 || this._moduleCount <= row + r) continue;

				for (let c = -1; c <= 7; c += 1) {

					if (col + c <= -1 || this._moduleCount <= col + c) continue;

					if ( (0 <= r && r <= 6 && (c == 0 || c == 6) )
							|| (0 <= c && c <= 6 && (r == 0 || r == 6) )
							|| (2 <= r && r <= 4 && 2 <= c && c <= 4) ) {
						this._modules[row + r][col + c] = true;
					} else {
						this._modules[row + r][col + c] = false;
					}
				}
			}
		};

		this.getBestMaskPattern = () => {

			let minLostPoint = 0;
			let pattern = 0;

			for (let i = 0; i < 8; i += 1) {

				this.makeImpl(true, i);

				let lostPoint = QRUtil.getLostPoint(this);

				if (i == 0 || minLostPoint > lostPoint) {
					minLostPoint = lostPoint;
					pattern = i;
				}
			}

			return pattern;
		};

		this.setupTimingPattern = () => {

			for (let r = 8; r < this._moduleCount - 8; r += 1) {
				if (this._modules[r][6] != null) {
					continue;
				}
				this._modules[r][6] = (r % 2 == 0);
			}

			for (let c = 8; c < this._moduleCount - 8; c += 1) {
				if (this._modules[6][c] != null) {
					continue;
				}
				this._modules[6][c] = (c % 2 == 0);
			}
		};

		this.setupPositionAdjustPattern = () => {

			let pos = QRUtil.getPatternPosition(this._typeNumber);

			for (let i = 0; i < pos.length; i += 1) {

				for (let j = 0; j < pos.length; j += 1) {

					let row = pos[i];
					let col = pos[j];

					if (this._modules[row][col] != null) {
						continue;
					}

					for (let r = -2; r <= 2; r += 1) {

						for (let c = -2; c <= 2; c += 1) {

							if (r == -2 || r == 2 || c == -2 || c == 2
									|| (r == 0 && c == 0) ) {
								this._modules[row + r][col + c] = true;
							} else {
								this._modules[row + r][col + c] = false;
							}
						}
					}
				}
			}
		};

		this.setupTypeNumber = (test) => {

			let bits = QRUtil.getBCHTypeNumber(this._typeNumber);

			for (let i = 0; i < 18; i += 1) {
				const mod = (!test && ( (bits >> i) & 1) == 1);
				this._modules[Math.floor(i / 3)][i % 3 + this._moduleCount - 8 - 3] = mod;
			}

			for (let i = 0; i < 18; i += 1) {
				const mod = (!test && ( (bits >> i) & 1) == 1);
				this._modules[i % 3 + this._moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
			}
		};

		this.setupTypeInfo = (test, maskPattern) => {

			let data = (this._errorCorrectionLevel << 3) | maskPattern;
			let bits = QRUtil.getBCHTypeInfo(data);

			// vertical
			for (let i = 0; i < 15; i += 1) {

				const mod = (!test && ( (bits >> i) & 1) == 1);

				if (i < 6) {
					this._modules[i][8] = mod;
				} else if (i < 8) {
					this._modules[i + 1][8] = mod;
				} else {
					this._modules[this._moduleCount - 15 + i][8] = mod;
				}
			}

			// horizontal
			for (let i = 0; i < 15; i += 1) {

				const mod = (!test && ( (bits >> i) & 1) == 1);

				if (i < 8) {
					this._modules[8][this._moduleCount - i - 1] = mod;
				} else if (i < 9) {
					this._modules[8][15 - i - 1 + 1] = mod;
				} else {
					this._modules[8][15 - i - 1] = mod;
				}
			}

			// fixed module
			this._modules[this._moduleCount - 8][8] = (!test);
		};

		this.mapData = (data, maskPattern) => {

			let inc = -1;
			let row = this._moduleCount - 1;
			let bitIndex = 7;
			let byteIndex = 0;
			let maskFunc = QRUtil.getMaskFunction(maskPattern);

			for (let col = this._moduleCount - 1; col > 0; col -= 2) {

				if (col == 6) col -= 1;

				while (true) {

					for (let c = 0; c < 2; c += 1) {

						if (this._modules[row][col - c] == null) {

							let dark = false;

							if (byteIndex < data.length) {
								dark = ( ( (data[byteIndex] >>> bitIndex) & 1) == 1);
							}

							let mask = maskFunc(row, col - c);

							if (mask) {
								dark = !dark;
							}

							this._modules[row][col - c] = dark;
							bitIndex -= 1;

							if (bitIndex == -1) {
								byteIndex += 1;
								bitIndex = 7;
							}
						}
					}

					row += inc;

					if (row < 0 || this._moduleCount <= row) {
						row -= inc;
						inc = -inc;
						break;
					}
				}
			}
		};

		this.createBytes = (buffer, rsBlocks) => {

			let offset = 0;

			let maxDcCount = 0;
			let maxEcCount = 0;

			let dcdata = new Array(rsBlocks.length);
			let ecdata = new Array(rsBlocks.length);

			for (let r = 0; r < rsBlocks.length; r += 1) {

				let dcCount = rsBlocks[r].dataCount;
				let ecCount = rsBlocks[r].totalCount - dcCount;

				maxDcCount = Math.max(maxDcCount, dcCount);
				maxEcCount = Math.max(maxEcCount, ecCount);

				dcdata[r] = new Array(dcCount);

				for (let i = 0; i < dcdata[r].length; i += 1) {
					dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
				}
				offset += dcCount;

				let rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
				let rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

				let modPoly = rawPoly.mod(rsPoly);
				ecdata[r] = new Array(rsPoly.getLength() - 1);
				for (let i = 0; i < ecdata[r].length; i += 1) {
					let modIndex = i + modPoly.getLength() - ecdata[r].length;
					ecdata[r][i] = (modIndex >= 0)? modPoly.getAt(modIndex) : 0;
				}
			}

			let totalCodeCount = 0;
			for (let i = 0; i < rsBlocks.length; i += 1) {
				totalCodeCount += rsBlocks[i].totalCount;
			}

			let data = new Array(totalCodeCount);
			let index = 0;

			for (let i = 0; i < maxDcCount; i += 1) {
				for (let r = 0; r < rsBlocks.length; r += 1) {
					if (i < dcdata[r].length) {
						data[index] = dcdata[r][i];
						index += 1;
					}
				}
			}

			for (let i = 0; i < maxEcCount; i += 1) {
				for (let r = 0; r < rsBlocks.length; r += 1) {
					if (i < ecdata[r].length) {
						data[index] = ecdata[r][i];
						index += 1;
					}
				}
			}

			return data;
		};

		this.createData = (typeNumber, errorCorrectionLevel, dataList) => {

			let rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

			let buffer = qrBitBuffer();

			for (let i = 0; i < dataList.length; i += 1) {
				let data = dataList[i];
				buffer.put(data.getMode(), 4);
				buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
				data.write(buffer);
			}

			// calc num max data.
			let totalDataCount = 0;
			for (let i = 0; i < rsBlocks.length; i += 1) {
				totalDataCount += rsBlocks[i].dataCount;
			}

			if (buffer.getLengthInBits() > totalDataCount * 8) {
				throw 'code length overflow. ('
					+ buffer.getLengthInBits()
					+ '>'
					+ totalDataCount * 8
					+ ')';
			}

			// end code
			if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
				buffer.put(0, 4);
			}

			// padding
			while (buffer.getLengthInBits() % 8 != 0) {
				buffer.putBit(false);
			}

			// padding
			while (true) {

				if (buffer.getLengthInBits() >= totalDataCount * 8) {
					break;
				}
				buffer.put(PAD0, 8);

				if (buffer.getLengthInBits() >= totalDataCount * 8) {
					break;
				}
				buffer.put(PAD1, 8);
			}

			return this.createBytes(buffer, rsBlocks);
		};

	}

	addData(data, mode) {

		mode = mode || 'Byte';

		let newData = null;

		switch(mode) {
		case 'Numeric' :
			newData = qrNumber(data);
			break;
		case 'Alphanumeric' :
			newData = qrAlphaNum(data);
			break;
		case 'Byte' :
			newData = qr8BitByte(data);
			break;
		case 'Kanji' :
			newData = qrKanji(data);
			break;
		default :
			throw 'mode:' + mode;
		}

		this._dataList.push(newData);
		this._dataCache = null;
	}

	/**
	 * @returns {boolean} true if the module at `row, col` is dark.
	 */
	isDark(row, col) {
		if (row < 0 || this._moduleCount <= row || col < 0 || this._moduleCount <= col) {
			throw row + ',' + col;
		}
		return this._modules[row][col];
	}

	/**
	 * @returns {integer} The module count in one dimension of the QR code.  The total number of modules is the square of this value.
	 */
	getModuleCount() {
		return this._moduleCount;
	}

	/**
	 * Call this when done adding data before getting the generated QR code image.
	 */
	make() {
		if (this._typeNumber < 1) {
			let typeNumber = 1;

			for (; typeNumber < 40; typeNumber++) {
				let rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this._errorCorrectionLevel);
				let buffer = qrBitBuffer();

				for (let i = 0; i < this._dataList.length; i++) {
					let data = this._dataList[i];
					buffer.put(data.getMode(), 4);
					buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber) );
					data.write(buffer);
				}

				let totalDataCount = 0;
				for (let i = 0; i < rsBlocks.length; i++) {
					totalDataCount += rsBlocks[i].dataCount;
				}

				if (buffer.getLengthInBits() <= totalDataCount * 8) {
					break;
				}
			}

			this._typeNumber = typeNumber;
		}

		this.makeImpl(false, this.getBestMaskPattern());
	}

	/**
	 * @param {Object} args
	 * @param {function} [args.drawCell] A callback with arguments `column, row, x, y` to draw a cell.  `x, y` are the coordinates to draw it at.  `c, y` are the QR code module indexes.  Returns the svg element child string for the cell.
	 * @param {function} [args.cellColor] A callback which returns the color for the cell.  By default, a function that returns `black`.  Unused if `drawCell` is provided.
	 * @param {integer} [args.margin] The margin to draw around the QR code, by number of cells.
	 * @param {Object} [args.obstruction] An image to place in the center of the QR code.
	 * @param {integer} args.obstruction.width Width of the obstruction as a percentage of QR code width.
	 * @param {integer} args.obstruction.height Height of the obstruction as a percentage of QR code height.
	 * @param {String} args.obstruction.path The path of the obstruction image.
	 * @returns {String} An svg tag as a string.
	 */
	createSvgTag({drawCell, cellColor, cellSize, margin, obstruction}) {
		drawCell = drawCell || ((c, r, x, y) =>
			'<rect ' +
				'width="' + cellSize + '" ' +
				'height="' + cellSize + '" ' +
				'x="' + x + '" ' +
				'y="' + y + '" ' +
				'fill="' + cellColor(c, r) + '" ' +
				'shape-rendering="crispEdges" ' +
			' />'
		);
		cellColor = cellColor || (() => 'black');
		cellSize = cellSize || 2;
		margin = (typeof margin == 'undefined')? cellSize * 4 : margin;
		let size = this.getModuleCount() * cellSize + margin * 2;
		let qrSvg = '';

		qrSvg += '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
		qrSvg += ' viewBox="0 0 ' + size + ' ' + size + '" ';
		qrSvg += ' preserveAspectRatio="xMinYMin meet">';
		qrSvg += '<rect width="100%" height="100%" fill="white" x="0" y="0"/>';

		const modCount = this.getModuleCount();
		const totalSize = modCount * cellSize + margin * 2;
		let obstructionCRStart, obstructionCREnd;
		if (obstruction) {
			const {width, height} = obstruction;
			const spans = [
				Math.ceil(width * modCount),
				Math.ceil(height * modCount),
			];
			obstructionCRStart = spans.map(s => Math.floor(modCount / 2 - s / 2));
			obstructionCREnd = spans.map(s => Math.ceil(modCount / 2 + s / 2));
		}

		for (let r = 0; r < modCount; r += 1) {
			const mr = r * cellSize + margin;
			for (let c = 0; c < modCount; c += 1) {
				const mc = c * cellSize + margin;
				if (
						obstruction &&
						c >= obstructionCRStart[0] && c < obstructionCREnd[0] &&
						r >= obstructionCRStart[1] && r < obstructionCREnd[1]) {
					if (c == obstructionCRStart[0] && r == obstructionCRStart[1]) {
						qrSvg += '<image ' +
							'x="' + (totalSize * (1.0 - obstruction.width) * 0.5).toFixed(3)	+ '" ' +
							'y="' + (totalSize * (1.0 - obstruction.height) * 0.5).toFixed(3)	+ '" ' +
							'width="' + (totalSize * obstruction.width).toFixed(3) + '" ' +
							'height="' + (totalSize * obstruction.height).toFixed(3) + '" ' +
							'preserveAspectRatio="xMidYMid meet" ' +
							'xlink:href="' + obstruction.path + '" ' +
						'/>';
					}
				} else if (this.isDark(r, c) ) {
					qrSvg += drawCell(c, r, mc, mr);
				}
			}
		}

		qrSvg += '</svg>';

		return qrSvg;
	}

	/**
	 * @param {integer} cellSize The size of a module in pixels.
	 * @param {integer} margin The margin to draw around the QR code in pixels.
	 * @returns {String} An img tag as a string.
	 */
	createImgTag(cellSize, margin) {

		cellSize = cellSize || 2;
		margin = (typeof margin == 'undefined')? cellSize * 4 : margin;

		let size = this.getModuleCount() * cellSize + margin * 2;
		let min = margin;
		let max = size - margin;
		let self = this;

		return createImgTag(size, size, function(x, y) {
			if (min <= x && x < max && min <= y && y < max) {
				let c = Math.floor( (x - min) / cellSize);
				let r = Math.floor( (y - min) / cellSize);
				return self.isDark(r, c)? 0 : 1;
			} else {
				return 1;
			}
		} );
	}
}

/**
 *
 */
const stringToBytesFuncs = {
	'default' : function(s) {
		let bytes = [];
		for (let i = 0; i < s.length; i += 1) {
			let c = s.charCodeAt(i);
			bytes.push(c & 0xff);
		}
		return bytes;
	},
};

/**
 *
 */
const stringToBytes = stringToBytesFuncs['default'];

//---------------------------------------------------------------------
// qrcode.createStringToBytes
//---------------------------------------------------------------------

/**
 *
 */
const QRMode = {
	MODE_NUMBER: 1 << 0,
	MODE_ALPHA_NUM: 1 << 1,
	MODE_8BIT_BYTE: 1 << 2,
	MODE_KANJI: 1 << 3,
};

/**
 *
 */
const QRErrorCorrectionLevel = {
	L : 1,
	M : 0,
	Q : 3,
	H : 2,
};

/**
 *
 */
const QRMaskPattern = {
	PATTERN000 : 0,
	PATTERN001 : 1,
	PATTERN010 : 2,
	PATTERN011 : 3,
	PATTERN100 : 4,
	PATTERN101 : 5,
	PATTERN110 : 6,
	PATTERN111 : 7,
};

//---------------------------------------------------------------------
// QRUtil
//---------------------------------------------------------------------

const QRUtil = function() {

	const PATTERN_POSITION_TABLE = [
		[],
		[6, 18],
		[6, 22],
		[6, 26],
		[6, 30],
		[6, 34],
		[6, 22, 38],
		[6, 24, 42],
		[6, 26, 46],
		[6, 28, 50],
		[6, 30, 54],
		[6, 32, 58],
		[6, 34, 62],
		[6, 26, 46, 66],
		[6, 26, 48, 70],
		[6, 26, 50, 74],
		[6, 30, 54, 78],
		[6, 30, 56, 82],
		[6, 30, 58, 86],
		[6, 34, 62, 90],
		[6, 28, 50, 72, 94],
		[6, 26, 50, 74, 98],
		[6, 30, 54, 78, 102],
		[6, 28, 54, 80, 106],
		[6, 32, 58, 84, 110],
		[6, 30, 58, 86, 114],
		[6, 34, 62, 90, 118],
		[6, 26, 50, 74, 98, 122],
		[6, 30, 54, 78, 102, 126],
		[6, 26, 52, 78, 104, 130],
		[6, 30, 56, 82, 108, 134],
		[6, 34, 60, 86, 112, 138],
		[6, 30, 58, 86, 114, 142],
		[6, 34, 62, 90, 118, 146],
		[6, 30, 54, 78, 102, 126, 150],
		[6, 24, 50, 76, 102, 128, 154],
		[6, 28, 54, 80, 106, 132, 158],
		[6, 32, 58, 84, 110, 136, 162],
		[6, 26, 54, 82, 110, 138, 166],
		[6, 30, 58, 86, 114, 142, 170],
	];
	const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
	const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
	const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

	let _this = {};

	let getBCHDigit = function(data) {
		let digit = 0;
		while (data != 0) {
			digit += 1;
			data >>>= 1;
		}
		return digit;
	};

	_this.getBCHTypeInfo = function(data) {
		let d = data << 10;
		while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
			d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15) ) );
		}
		return ( (data << 10) | d) ^ G15_MASK;
	};

	_this.getBCHTypeNumber = function(data) {
		let d = data << 12;
		while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
			d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18) ) );
		}
		return (data << 12) | d;
	};

	_this.getPatternPosition = function(typeNumber) {
		return PATTERN_POSITION_TABLE[typeNumber - 1];
	};

	_this.getMaskFunction = function(maskPattern) {

		switch (maskPattern) {

		case QRMaskPattern.PATTERN000 :
			return function(i, j) { return (i + j) % 2 == 0; };
		case QRMaskPattern.PATTERN001 :
			return function(i, _) { return i % 2 == 0; };
		case QRMaskPattern.PATTERN010 :
			return function(i, j) { return j % 3 == 0; };
		case QRMaskPattern.PATTERN011 :
			return function(i, j) { return (i + j) % 3 == 0; };
		case QRMaskPattern.PATTERN100 :
			return function(i, j) { return (Math.floor(i / 2) + Math.floor(j / 3) ) % 2 == 0; };
		case QRMaskPattern.PATTERN101 :
			return function(i, j) { return (i * j) % 2 + (i * j) % 3 == 0; };
		case QRMaskPattern.PATTERN110 :
			return function(i, j) { return ( (i * j) % 2 + (i * j) % 3) % 2 == 0; };
		case QRMaskPattern.PATTERN111 :
			return function(i, j) { return ( (i * j) % 3 + (i + j) % 2) % 2 == 0; };

		default :
			throw 'bad maskPattern:' + maskPattern;
		}
	};

	_this.getErrorCorrectPolynomial = function(errorCorrectLength) {
		let a = qrPolynomial([1], 0);
		for (let i = 0; i < errorCorrectLength; i += 1) {
			a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0) );
		}
		return a;
	};

	_this.getLengthInBits = function(mode, type) {

		if (1 <= type && type < 10) {

			// 1 - 9

			switch(mode) {
			case QRMode.MODE_NUMBER		: return 10;
			case QRMode.MODE_ALPHA_NUM : return 9;
			case QRMode.MODE_8BIT_BYTE : return 8;
			case QRMode.MODE_KANJI		 : return 8;
			default :
				throw 'mode:' + mode;
			}

		} else if (type < 27) {

			// 10 - 26

			switch(mode) {
			case QRMode.MODE_NUMBER		: return 12;
			case QRMode.MODE_ALPHA_NUM : return 11;
			case QRMode.MODE_8BIT_BYTE : return 16;
			case QRMode.MODE_KANJI		 : return 10;
			default :
				throw 'mode:' + mode;
			}

		} else if (type < 41) {

			// 27 - 40

			switch(mode) {
			case QRMode.MODE_NUMBER		: return 14;
			case QRMode.MODE_ALPHA_NUM : return 13;
			case QRMode.MODE_8BIT_BYTE : return 16;
			case QRMode.MODE_KANJI		 : return 12;
			default :
				throw 'mode:' + mode;
			}

		} else {
			throw 'type:' + type;
		}
	};

	_this.getLostPoint = function(qrcode) {

		let moduleCount = qrcode.getModuleCount();

		let lostPoint = 0;

		// LEVEL1

		for (let row = 0; row < moduleCount; row += 1) {
			for (let col = 0; col < moduleCount; col += 1) {

				let sameCount = 0;
				let dark = qrcode.isDark(row, col);

				for (let r = -1; r <= 1; r += 1) {

					if (row + r < 0 || moduleCount <= row + r) {
						continue;
					}

					for (let c = -1; c <= 1; c += 1) {

						if (col + c < 0 || moduleCount <= col + c) {
							continue;
						}

						if (r == 0 && c == 0) {
							continue;
						}

						if (dark == qrcode.isDark(row + r, col + c) ) {
							sameCount += 1;
						}
					}
				}

				if (sameCount > 5) {
					lostPoint += (3 + sameCount - 5);
				}
			}
		}

		// LEVEL2

		for (let row = 0; row < moduleCount - 1; row += 1) {
			for (let col = 0; col < moduleCount - 1; col += 1) {
				let count = 0;
				if (qrcode.isDark(row, col) ) count += 1;
				if (qrcode.isDark(row + 1, col) ) count += 1;
				if (qrcode.isDark(row, col + 1) ) count += 1;
				if (qrcode.isDark(row + 1, col + 1) ) count += 1;
				if (count == 0 || count == 4) {
					lostPoint += 3;
				}
			}
		}

		// LEVEL3

		for (let row = 0; row < moduleCount; row += 1) {
			for (let col = 0; col < moduleCount - 6; col += 1) {
				if (qrcode.isDark(row, col)
						&& !qrcode.isDark(row, col + 1)
						&&	qrcode.isDark(row, col + 2)
						&&	qrcode.isDark(row, col + 3)
						&&	qrcode.isDark(row, col + 4)
						&& !qrcode.isDark(row, col + 5)
						&&	qrcode.isDark(row, col + 6) ) {
					lostPoint += 40;
				}
			}
		}

		for (let col = 0; col < moduleCount; col += 1) {
			for (let row = 0; row < moduleCount - 6; row += 1) {
				if (qrcode.isDark(row, col)
						&& !qrcode.isDark(row + 1, col)
						&&	qrcode.isDark(row + 2, col)
						&&	qrcode.isDark(row + 3, col)
						&&	qrcode.isDark(row + 4, col)
						&& !qrcode.isDark(row + 5, col)
						&&	qrcode.isDark(row + 6, col) ) {
					lostPoint += 40;
				}
			}
		}

		// LEVEL4

		let darkCount = 0;

		for (let col = 0; col < moduleCount; col += 1) {
			for (let row = 0; row < moduleCount; row += 1) {
				if (qrcode.isDark(row, col) ) {
					darkCount += 1;
				}
			}
		}

		let ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
		lostPoint += ratio * 10;

		return lostPoint;
	};

	return _this;
}();

//---------------------------------------------------------------------
// QRMath
//---------------------------------------------------------------------

let QRMath = function() {

	let EXP_TABLE = new Array(256);
	let LOG_TABLE = new Array(256);

	// initialize tables
	for (let i = 0; i < 8; i += 1) {
		EXP_TABLE[i] = 1 << i;
	}
	for (let i = 8; i < 256; i += 1) {
		EXP_TABLE[i] = EXP_TABLE[i - 4]
			^ EXP_TABLE[i - 5]
			^ EXP_TABLE[i - 6]
			^ EXP_TABLE[i - 8];
	}
	for (let i = 0; i < 255; i += 1) {
		LOG_TABLE[EXP_TABLE[i] ] = i;
	}

	let _this = {};

	_this.glog = function(n) {

		if (n < 1) {
			throw 'glog(' + n + ')';
		}

		return LOG_TABLE[n];
	};

	_this.gexp = function(n) {

		while (n < 0) {
			n += 255;
		}

		while (n >= 256) {
			n -= 255;
		}

		return EXP_TABLE[n];
	};

	return _this;
}();

//---------------------------------------------------------------------
// qrPolynomial
//---------------------------------------------------------------------

function qrPolynomial(num, shift) {

	if (typeof num.length == 'undefined') {
		throw num.length + '/' + shift;
	}

	let _num = function() {
		let offset = 0;
		while (offset < num.length && num[offset] == 0) {
			offset += 1;
		}
		let _num = new Array(num.length - offset + shift);
		for (let i = 0; i < num.length - offset; i += 1) {
			_num[i] = num[i + offset];
		}
		return _num;
	}();

	let _this = {};

	_this.getAt = function(index) {
		return _num[index];
	};

	_this.getLength = function() {
		return _num.length;
	};

	_this.multiply = function(e) {

		let num = new Array(_this.getLength() + e.getLength() - 1);

		for (let i = 0; i < _this.getLength(); i += 1) {
			for (let j = 0; j < e.getLength(); j += 1) {
				num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i) ) + QRMath.glog(e.getAt(j) ) );
			}
		}

		return qrPolynomial(num, 0);
	};

	_this.mod = function(e) {

		if (_this.getLength() - e.getLength() < 0) {
			return _this;
		}

		let ratio = QRMath.glog(_this.getAt(0) ) - QRMath.glog(e.getAt(0) );

		let num = new Array(_this.getLength() );
		for (let i = 0; i < _this.getLength(); i += 1) {
			num[i] = _this.getAt(i);
		}

		for (let i = 0; i < e.getLength(); i += 1) {
			num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i) ) + ratio);
		}

		// recursive call
		return qrPolynomial(num, 0).mod(e);
	};

	return _this;
}

//---------------------------------------------------------------------
// QRRSBlock
//---------------------------------------------------------------------

const QRRSBlock = function() {

	let RS_BLOCK_TABLE = [

		// L
		// M
		// Q
		// H

		// 1
		[1, 26, 19],
		[1, 26, 16],
		[1, 26, 13],
		[1, 26, 9],

		// 2
		[1, 44, 34],
		[1, 44, 28],
		[1, 44, 22],
		[1, 44, 16],

		// 3
		[1, 70, 55],
		[1, 70, 44],
		[2, 35, 17],
		[2, 35, 13],

		// 4
		[1, 100, 80],
		[2, 50, 32],
		[2, 50, 24],
		[4, 25, 9],

		// 5
		[1, 134, 108],
		[2, 67, 43],
		[2, 33, 15, 2, 34, 16],
		[2, 33, 11, 2, 34, 12],

		// 6
		[2, 86, 68],
		[4, 43, 27],
		[4, 43, 19],
		[4, 43, 15],

		// 7
		[2, 98, 78],
		[4, 49, 31],
		[2, 32, 14, 4, 33, 15],
		[4, 39, 13, 1, 40, 14],

		// 8
		[2, 121, 97],
		[2, 60, 38, 2, 61, 39],
		[4, 40, 18, 2, 41, 19],
		[4, 40, 14, 2, 41, 15],

		// 9
		[2, 146, 116],
		[3, 58, 36, 2, 59, 37],
		[4, 36, 16, 4, 37, 17],
		[4, 36, 12, 4, 37, 13],

		// 10
		[2, 86, 68, 2, 87, 69],
		[4, 69, 43, 1, 70, 44],
		[6, 43, 19, 2, 44, 20],
		[6, 43, 15, 2, 44, 16],

		// 11
		[4, 101, 81],
		[1, 80, 50, 4, 81, 51],
		[4, 50, 22, 4, 51, 23],
		[3, 36, 12, 8, 37, 13],

		// 12
		[2, 116, 92, 2, 117, 93],
		[6, 58, 36, 2, 59, 37],
		[4, 46, 20, 6, 47, 21],
		[7, 42, 14, 4, 43, 15],

		// 13
		[4, 133, 107],
		[8, 59, 37, 1, 60, 38],
		[8, 44, 20, 4, 45, 21],
		[12, 33, 11, 4, 34, 12],

		// 14
		[3, 145, 115, 1, 146, 116],
		[4, 64, 40, 5, 65, 41],
		[11, 36, 16, 5, 37, 17],
		[11, 36, 12, 5, 37, 13],

		// 15
		[5, 109, 87, 1, 110, 88],
		[5, 65, 41, 5, 66, 42],
		[5, 54, 24, 7, 55, 25],
		[11, 36, 12, 7, 37, 13],

		// 16
		[5, 122, 98, 1, 123, 99],
		[7, 73, 45, 3, 74, 46],
		[15, 43, 19, 2, 44, 20],
		[3, 45, 15, 13, 46, 16],

		// 17
		[1, 135, 107, 5, 136, 108],
		[10, 74, 46, 1, 75, 47],
		[1, 50, 22, 15, 51, 23],
		[2, 42, 14, 17, 43, 15],

		// 18
		[5, 150, 120, 1, 151, 121],
		[9, 69, 43, 4, 70, 44],
		[17, 50, 22, 1, 51, 23],
		[2, 42, 14, 19, 43, 15],

		// 19
		[3, 141, 113, 4, 142, 114],
		[3, 70, 44, 11, 71, 45],
		[17, 47, 21, 4, 48, 22],
		[9, 39, 13, 16, 40, 14],

		// 20
		[3, 135, 107, 5, 136, 108],
		[3, 67, 41, 13, 68, 42],
		[15, 54, 24, 5, 55, 25],
		[15, 43, 15, 10, 44, 16],

		// 21
		[4, 144, 116, 4, 145, 117],
		[17, 68, 42],
		[17, 50, 22, 6, 51, 23],
		[19, 46, 16, 6, 47, 17],

		// 22
		[2, 139, 111, 7, 140, 112],
		[17, 74, 46],
		[7, 54, 24, 16, 55, 25],
		[34, 37, 13],

		// 23
		[4, 151, 121, 5, 152, 122],
		[4, 75, 47, 14, 76, 48],
		[11, 54, 24, 14, 55, 25],
		[16, 45, 15, 14, 46, 16],

		// 24
		[6, 147, 117, 4, 148, 118],
		[6, 73, 45, 14, 74, 46],
		[11, 54, 24, 16, 55, 25],
		[30, 46, 16, 2, 47, 17],

		// 25
		[8, 132, 106, 4, 133, 107],
		[8, 75, 47, 13, 76, 48],
		[7, 54, 24, 22, 55, 25],
		[22, 45, 15, 13, 46, 16],

		// 26
		[10, 142, 114, 2, 143, 115],
		[19, 74, 46, 4, 75, 47],
		[28, 50, 22, 6, 51, 23],
		[33, 46, 16, 4, 47, 17],

		// 27
		[8, 152, 122, 4, 153, 123],
		[22, 73, 45, 3, 74, 46],
		[8, 53, 23, 26, 54, 24],
		[12, 45, 15, 28, 46, 16],

		// 28
		[3, 147, 117, 10, 148, 118],
		[3, 73, 45, 23, 74, 46],
		[4, 54, 24, 31, 55, 25],
		[11, 45, 15, 31, 46, 16],

		// 29
		[7, 146, 116, 7, 147, 117],
		[21, 73, 45, 7, 74, 46],
		[1, 53, 23, 37, 54, 24],
		[19, 45, 15, 26, 46, 16],

		// 30
		[5, 145, 115, 10, 146, 116],
		[19, 75, 47, 10, 76, 48],
		[15, 54, 24, 25, 55, 25],
		[23, 45, 15, 25, 46, 16],

		// 31
		[13, 145, 115, 3, 146, 116],
		[2, 74, 46, 29, 75, 47],
		[42, 54, 24, 1, 55, 25],
		[23, 45, 15, 28, 46, 16],

		// 32
		[17, 145, 115],
		[10, 74, 46, 23, 75, 47],
		[10, 54, 24, 35, 55, 25],
		[19, 45, 15, 35, 46, 16],

		// 33
		[17, 145, 115, 1, 146, 116],
		[14, 74, 46, 21, 75, 47],
		[29, 54, 24, 19, 55, 25],
		[11, 45, 15, 46, 46, 16],

		// 34
		[13, 145, 115, 6, 146, 116],
		[14, 74, 46, 23, 75, 47],
		[44, 54, 24, 7, 55, 25],
		[59, 46, 16, 1, 47, 17],

		// 35
		[12, 151, 121, 7, 152, 122],
		[12, 75, 47, 26, 76, 48],
		[39, 54, 24, 14, 55, 25],
		[22, 45, 15, 41, 46, 16],

		// 36
		[6, 151, 121, 14, 152, 122],
		[6, 75, 47, 34, 76, 48],
		[46, 54, 24, 10, 55, 25],
		[2, 45, 15, 64, 46, 16],

		// 37
		[17, 152, 122, 4, 153, 123],
		[29, 74, 46, 14, 75, 47],
		[49, 54, 24, 10, 55, 25],
		[24, 45, 15, 46, 46, 16],

		// 38
		[4, 152, 122, 18, 153, 123],
		[13, 74, 46, 32, 75, 47],
		[48, 54, 24, 14, 55, 25],
		[42, 45, 15, 32, 46, 16],

		// 39
		[20, 147, 117, 4, 148, 118],
		[40, 75, 47, 7, 76, 48],
		[43, 54, 24, 22, 55, 25],
		[10, 45, 15, 67, 46, 16],

		// 40
		[19, 148, 118, 6, 149, 119],
		[18, 75, 47, 31, 76, 48],
		[34, 54, 24, 34, 55, 25],
		[20, 45, 15, 61, 46, 16],
	];

	let qrRSBlock = function(totalCount, dataCount) {
		let _this = {};
		_this.totalCount = totalCount;
		_this.dataCount = dataCount;
		return _this;
	};

	let _this = {};

	let getRsBlockTable = function(typeNumber, errorCorrectionLevel) {

		switch(errorCorrectionLevel) {
		case QRErrorCorrectionLevel.L :
			return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
		case QRErrorCorrectionLevel.M :
			return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
		case QRErrorCorrectionLevel.Q :
			return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
		case QRErrorCorrectionLevel.H :
			return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
		default :
			return undefined;
		}
	};

	_this.getRSBlocks = function(typeNumber, errorCorrectionLevel) {

		let rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

		if (typeof rsBlock == 'undefined') {
			throw 'bad rs block @ typeNumber:' + typeNumber +
					'/errorCorrectionLevel:' + errorCorrectionLevel;
		}

		let length = rsBlock.length / 3;

		let list = [];

		for (let i = 0; i < length; i += 1) {

			let count = rsBlock[i * 3 + 0];
			let totalCount = rsBlock[i * 3 + 1];
			let dataCount = rsBlock[i * 3 + 2];

			for (let j = 0; j < count; j += 1) {
				list.push(qrRSBlock(totalCount, dataCount) );
			}
		}

		return list;
	};

	return _this;
}();

//---------------------------------------------------------------------
// qrBitBuffer
//---------------------------------------------------------------------

let qrBitBuffer = function() {

	let _buffer = [];
	let _length = 0;

	let _this = {};

	_this.getBuffer = function() {
		return _buffer;
	};

	_this.getAt = function(index) {
		let bufIndex = Math.floor(index / 8);
		return ( (_buffer[bufIndex] >>> (7 - index % 8) ) & 1) == 1;
	};

	_this.put = function(num, length) {
		for (let i = 0; i < length; i += 1) {
			_this.putBit( ( (num >>> (length - i - 1) ) & 1) == 1);
		}
	};

	_this.getLengthInBits = function() {
		return _length;
	};

	_this.putBit = function(bit) {

		let bufIndex = Math.floor(_length / 8);
		if (_buffer.length <= bufIndex) {
			_buffer.push(0);
		}

		if (bit) {
			_buffer[bufIndex] |= (0x80 >>> (_length % 8) );
		}

		_length += 1;
	};

	return _this;
};

//---------------------------------------------------------------------
// qrNumber
//---------------------------------------------------------------------

let qrNumber = function(data) {

	let _mode = QRMode.MODE_NUMBER;
	let _data = data;

	let _this = {};

	_this.getMode = function() {
		return _mode;
	};

	_this.getLength = function(_) {
		return _data.length;
	};

	_this.write = function(buffer) {

		let data = _data;

		let i = 0;

		while (i + 2 < data.length) {
			buffer.put(strToNum(data.substring(i, i + 3) ), 10);
			i += 3;
		}

		if (i < data.length) {
			if (data.length - i == 1) {
				buffer.put(strToNum(data.substring(i, i + 1) ), 4);
			} else if (data.length - i == 2) {
				buffer.put(strToNum(data.substring(i, i + 2) ), 7);
			}
		}
	};

	const strToNum = function(s) {
		let num = 0;
		for (let i = 0; i < s.length; i += 1) {
			num = num * 10 + chatToNum(s.charAt(i) );
		}
		return num;
	};

	const chatToNum = function(c) {
		if ('0' <= c && c <= '9') {
			return c.charCodeAt(0) - '0'.charCodeAt(0);
		}
		throw 'illegal char :' + c;
	};

	return _this;
};

//---------------------------------------------------------------------
// qrAlphaNum
//---------------------------------------------------------------------

const qrAlphaNum = function(data) {

	let _mode = QRMode.MODE_ALPHA_NUM;
	let _data = data;

	let _this = {};

	_this.getMode = function() {
		return _mode;
	};

	_this.getLength = function(_) {
		return _data.length;
	};

	_this.write = function(buffer) {

		let s = _data;

		let i = 0;

		while (i + 1 < s.length) {
			buffer.put(
				getCode(s.charAt(i) ) * 45 +
				getCode(s.charAt(i + 1) ), 11);
			i += 2;
		}

		if (i < s.length) {
			buffer.put(getCode(s.charAt(i) ), 6);
		}
	};

	const getCode = function(c) {

		if ('0' <= c && c <= '9') {
			return c.charCodeAt(0) - '0'.charCodeAt(0);
		} else if ('A' <= c && c <= 'Z') {
			return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
		} else {
			switch (c) {
			case ' ' : return 36;
			case '$' : return 37;
			case '%' : return 38;
			case '*' : return 39;
			case '+' : return 40;
			case '-' : return 41;
			case '.' : return 42;
			case '/' : return 43;
			case ':' : return 44;
			default :
				throw 'illegal char :' + c;
			}
		}
	};

	return _this;
};

//---------------------------------------------------------------------
// qr8BitByte
//---------------------------------------------------------------------

const qr8BitByte = function(data) {

	let _mode = QRMode.MODE_8BIT_BYTE;
	let _bytes = stringToBytes(data);

	let _this = {};

	_this.getMode = function() {
		return _mode;
	};

	_this.getLength = function(_) {
		return _bytes.length;
	};

	_this.write = function(buffer) {
		for (let i = 0; i < _bytes.length; i += 1) {
			buffer.put(_bytes[i], 8);
		}
	};

	return _this;
};

//---------------------------------------------------------------------
// qrKanji
//---------------------------------------------------------------------

const qrKanji = function(data) {

	let _mode = QRMode.MODE_KANJI;

	let stringToBytes = stringToBytesFuncs['SJIS'];
	if (!stringToBytes) {
		throw 'sjis not supported.';
	}
	!function(c, code) {
		// self test for sjis support.
		let test = stringToBytes(c);
		if (test.length != 2 || ( (test[0] << 8) | test[1]) != code) {
			throw 'sjis not supported.';
		}
	}('\u53cb', 0x9746);

	let _bytes = stringToBytes(data);

	let _this = {};

	_this.getMode = function() {
		return _mode;
	};

	_this.getLength = function(_) {
		return ~~(_bytes.length / 2);
	};

	_this.write = function(buffer) {

		let data = _bytes;

		let i = 0;

		while (i + 1 < data.length) {

			let c = ( (0xff & data[i]) << 8) | (0xff & data[i + 1]);

			if (0x8140 <= c && c <= 0x9FFC) {
				c -= 0x8140;
			} else if (0xE040 <= c && c <= 0xEBBF) {
				c -= 0xC140;
			} else {
				throw 'illegal char at ' + (i + 1) + '/' + c;
			}

			c = ( (c >>> 8) & 0xff) * 0xC0 + (c & 0xff);

			buffer.put(c, 13);

			i += 2;
		}

		if (i < data.length) {
			throw 'illegal char at ' + (i + 1);
		}
	};

	return _this;
};

//=====================================================================
// GIF Support etc.
//

//---------------------------------------------------------------------
// byteArrayOutputStream
//---------------------------------------------------------------------

let byteArrayOutputStream = function() {

	let _bytes = [];

	let _this = {};

	_this.writeByte = function(b) {
		_bytes.push(b & 0xff);
	};

	_this.writeShort = function(i) {
		_this.writeByte(i);
		_this.writeByte(i >>> 8);
	};

	_this.writeBytes = function(b, off, len) {
		off = off || 0;
		len = len || b.length;
		for (let i = 0; i < len; i += 1) {
			_this.writeByte(b[i + off]);
		}
	};

	_this.writeString = function(s) {
		for (let i = 0; i < s.length; i += 1) {
			_this.writeByte(s.charCodeAt(i) );
		}
	};

	_this.toByteArray = function() {
		return _bytes;
	};

	_this.toString = function() {
		let s = '';
		s += '[';
		for (let i = 0; i < _bytes.length; i += 1) {
			if (i > 0) {
				s += ',';
			}
			s += _bytes[i];
		}
		s += ']';
		return s;
	};

	return _this;
};

//---------------------------------------------------------------------
// base64EncodeOutputStream
//---------------------------------------------------------------------

let base64EncodeOutputStream = function() {

	let _buffer = 0;
	let _buflen = 0;
	let _length = 0;
	let _base64 = '';

	let _this = {};

	let writeEncoded = function(b) {
		_base64 += String.fromCharCode(encode(b & 0x3f) );
	};

	const encode = function(n) {
		if (n < 0) {
			// error.
		} else if (n < 26) {
			return 0x41 + n;
		} else if (n < 52) {
			return 0x61 + (n - 26);
		} else if (n < 62) {
			return 0x30 + (n - 52);
		} else if (n == 62) {
			return 0x2b;
		} else if (n == 63) {
			return 0x2f;
		}
		throw 'n:' + n;
	};

	_this.writeByte = function(n) {

		_buffer = (_buffer << 8) | (n & 0xff);
		_buflen += 8;
		_length += 1;

		while (_buflen >= 6) {
			writeEncoded(_buffer >>> (_buflen - 6) );
			_buflen -= 6;
		}
	};

	_this.flush = function() {

		if (_buflen > 0) {
			writeEncoded(_buffer << (6 - _buflen) );
			_buffer = 0;
			_buflen = 0;
		}

		if (_length % 3 != 0) {
			// padding
			let padlen = 3 - _length % 3;
			for (let i = 0; i < padlen; i += 1) {
				_base64 += '=';
			}
		}
	};

	_this.toString = function() {
		return _base64;
	};

	return _this;
};

//---------------------------------------------------------------------
// gifImage (B/W)
//---------------------------------------------------------------------

let gifImage = function(width, height) {

	let _width = width;
	let _height = height;
	let _data = new Array(width * height);

	let _this = {};

	_this.setPixel = function(x, y, pixel) {
		_data[y * _width + x] = pixel;
	};

	_this.write = function(out) {

		//---------------------------------
		// GIF Signature

		out.writeString('GIF87a');

		//---------------------------------
		// Screen Descriptor

		out.writeShort(_width);
		out.writeShort(_height);

		out.writeByte(0x80); // 2bit
		out.writeByte(0);
		out.writeByte(0);

		//---------------------------------
		// Global Color Map

		// black
		out.writeByte(0x00);
		out.writeByte(0x00);
		out.writeByte(0x00);

		// white
		out.writeByte(0xff);
		out.writeByte(0xff);
		out.writeByte(0xff);

		//---------------------------------
		// Image Descriptor

		out.writeString(',');
		out.writeShort(0);
		out.writeShort(0);
		out.writeShort(_width);
		out.writeShort(_height);
		out.writeByte(0);

		//---------------------------------
		// Local Color Map

		//---------------------------------
		// Raster Data

		let lzwMinCodeSize = 2;
		let raster = getLZWRaster(lzwMinCodeSize);

		out.writeByte(lzwMinCodeSize);

		let offset = 0;

		while (raster.length - offset > 255) {
			out.writeByte(255);
			out.writeBytes(raster, offset, 255);
			offset += 255;
		}

		out.writeByte(raster.length - offset);
		out.writeBytes(raster, offset, raster.length - offset);
		out.writeByte(0x00);

		//---------------------------------
		// GIF Terminator
		out.writeString(';');
	};

	let bitOutputStream = function(out) {

		let _out = out;
		let _bitLength = 0;
		let _bitBuffer = 0;

		let _this = {};

		_this.write = function(data, length) {

			if ( (data >>> length) != 0) {
				throw 'length over';
			}

			while (_bitLength + length >= 8) {
				_out.writeByte(0xff & ( (data << _bitLength) | _bitBuffer) );
				length -= (8 - _bitLength);
				data >>>= (8 - _bitLength);
				_bitBuffer = 0;
				_bitLength = 0;
			}

			_bitBuffer = (data << _bitLength) | _bitBuffer;
			_bitLength = _bitLength + length;
		};

		_this.flush = function() {
			if (_bitLength > 0) {
				_out.writeByte(_bitBuffer);
			}
		};

		return _this;
	};

	const getLZWRaster = function(lzwMinCodeSize) {

		let clearCode = 1 << lzwMinCodeSize;
		let endCode = (1 << lzwMinCodeSize) + 1;
		let bitLength = lzwMinCodeSize + 1;

		// Setup LZWTable
		let table = lzwTable();

		for (let i = 0; i < clearCode; i += 1) {
			table.add(String.fromCharCode(i) );
		}
		table.add(String.fromCharCode(clearCode) );
		table.add(String.fromCharCode(endCode) );

		let byteOut = byteArrayOutputStream();
		let bitOut = bitOutputStream(byteOut);

		// clear code
		bitOut.write(clearCode, bitLength);

		let dataIndex = 0;

		let s = String.fromCharCode(_data[dataIndex]);
		dataIndex += 1;

		while (dataIndex < _data.length) {

			let c = String.fromCharCode(_data[dataIndex]);
			dataIndex += 1;

			if (table.contains(s + c) ) {

				s = s + c;

			} else {

				bitOut.write(table.indexOf(s), bitLength);

				if (table.size() < 0xfff) {

					if (table.size() == (1 << bitLength) ) {
						bitLength += 1;
					}

					table.add(s + c);
				}

				s = c;
			}
		}

		bitOut.write(table.indexOf(s), bitLength);

		// end code
		bitOut.write(endCode, bitLength);

		bitOut.flush();

		return byteOut.toByteArray();
	};

	const lzwTable = function() {

		let _map = {};
		let _size = 0;

		let _this = {};

		_this.add = function(key) {
			if (_this.contains(key) ) {
				throw 'dup key:' + key;
			}
			_map[key] = _size;
			_size += 1;
		};

		_this.size = function() {
			return _size;
		};

		_this.indexOf = function(key) {
			return _map[key];
		};

		_this.contains = function(key) {
			return typeof _map[key] != 'undefined';
		};

		return _this;
	};

	return _this;
};

const createImgTag = function(width, height, getPixel, alt) {

	let gif = gifImage(width, height);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			gif.setPixel(x, y, getPixel(x, y) );
		}
	}

	let b = byteArrayOutputStream();
	gif.write(b);

	let base64 = base64EncodeOutputStream();
	let bytes = b.toByteArray();
	for (let i = 0; i < bytes.length; i += 1) {
		base64.writeByte(bytes[i]);
	}
	base64.flush();

	let img = '';
	img += '<img';
	img += '\u0020src="';
	img += 'data:image/gif;base64,';
	img += base64;
	img += '"';
	img += '\u0020width="';
	img += width;
	img += '"';
	img += '\u0020height="';
	img += height;
	img += '"';
	if (alt) {
		img += '\u0020alt="';
		img += alt;
		img += '"';
	}
	img += '/>';

	return img;
};

// multibyte support
stringToBytesFuncs['UTF-8'] = function(s) {
	// http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
	function toUTF8Array(str) {
		let utf8 = [];
		for (let i=0; i < str.length; i++) {
			let charcode = str.charCodeAt(i);
			if (charcode < 0x80) utf8.push(charcode);
			else if (charcode < 0x800) {
				utf8.push(0xc0 | (charcode >> 6),
						0x80 | (charcode & 0x3f));
			}
			else if (charcode < 0xd800 || charcode >= 0xe000) {
				utf8.push(0xe0 | (charcode >> 12),
						0x80 | ((charcode>>6) & 0x3f),
						0x80 | (charcode & 0x3f));
			}
			// surrogate pair
			else {
				i++;
				// UTF-16 encodes 0x10000-0x10FFFF by
				// subtracting 0x10000 and splitting the
				// 20 bits of 0x0-0xFFFFF into two halves
				charcode = 0x10000 + (((charcode & 0x3ff)<<10)
					| (str.charCodeAt(i) & 0x3ff));
				utf8.push(0xf0 | (charcode >>18),
						0x80 | ((charcode>>12) & 0x3f),
						0x80 | ((charcode>>6) & 0x3f),
						0x80 | (charcode & 0x3f));
			}
		}
		return utf8;
	}
	return toUTF8Array(s);
};

var strictUriEncode = function (str) {
	return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
		return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	});
};

/*
object-assign
(c) Sindre Sorhus
@license MIT
*/

/* eslint-disable no-unused-vars */
var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
	if (val === null || val === undefined) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

function shouldUseNative() {
	try {
		if (!Object.assign) {
			return false;
		}

		// Detect buggy property enumeration order in older V8 versions.

		// https://bugs.chromium.org/p/v8/issues/detail?id=4118
		var test1 = new String('abc');  // eslint-disable-line no-new-wrappers
		test1[5] = 'de';
		if (Object.getOwnPropertyNames(test1)[0] === '5') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test2 = {};
		for (var i = 0; i < 10; i++) {
			test2['_' + String.fromCharCode(i)] = i;
		}
		var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
			return test2[n];
		});
		if (order2.join('') !== '0123456789') {
			return false;
		}

		// https://bugs.chromium.org/p/v8/issues/detail?id=3056
		var test3 = {};
		'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
			test3[letter] = letter;
		});
		if (Object.keys(Object.assign({}, test3)).join('') !==
				'abcdefghijklmnopqrst') {
			return false;
		}

		return true;
	} catch (err) {
		// We don't expect any of the above to throw, but better to be safe.
		return false;
	}
}

var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
	var from;
	var to = toObject(target);
	var symbols;

	for (var s = 1; s < arguments.length; s++) {
		from = Object(arguments[s]);

		for (var key in from) {
			if (hasOwnProperty.call(from, key)) {
				to[key] = from[key];
			}
		}

		if (getOwnPropertySymbols) {
			symbols = getOwnPropertySymbols(from);
			for (var i = 0; i < symbols.length; i++) {
				if (propIsEnumerable.call(from, symbols[i])) {
					to[symbols[i]] = from[symbols[i]];
				}
			}
		}
	}

	return to;
};

var token = '%[a-f0-9]{2}';
var singleMatcher = new RegExp(token, 'gi');
var multiMatcher = new RegExp('(' + token + ')+', 'gi');

function decodeComponents(components, split) {
	try {
		// Try to decode the entire string first
		return decodeURIComponent(components.join(''));
	} catch (err) {
		// Do nothing
	}

	if (components.length === 1) {
		return components;
	}

	split = split || 1;

	// Split the array in 2 parts
	var left = components.slice(0, split);
	var right = components.slice(split);

	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
}

function decode(input) {
	try {
		return decodeURIComponent(input);
	} catch (err) {
		var tokens = input.match(singleMatcher);

		for (var i = 1; i < tokens.length; i++) {
			input = decodeComponents(tokens, i).join('');

			tokens = input.match(singleMatcher);
		}

		return input;
	}
}

function customDecodeURIComponent(input) {
	// Keep track of all the replacements and prefill the map with the `BOM`
	var replaceMap = {
		'%FE%FF': '\uFFFD\uFFFD',
		'%FF%FE': '\uFFFD\uFFFD'
	};

	var match = multiMatcher.exec(input);
	while (match) {
		try {
			// Decode as big chunks as possible
			replaceMap[match[0]] = decodeURIComponent(match[0]);
		} catch (err) {
			var result = decode(match[0]);

			if (result !== match[0]) {
				replaceMap[match[0]] = result;
			}
		}

		match = multiMatcher.exec(input);
	}

	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
	replaceMap['%C2'] = '\uFFFD';

	var entries = Object.keys(replaceMap);

	for (var i = 0; i < entries.length; i++) {
		// Replace all decoded components
		var key = entries[i];
		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
	}

	return input;
}

var decodeUriComponent = function (encodedURI) {
	if (typeof encodedURI !== 'string') {
		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
	}

	try {
		encodedURI = encodedURI.replace(/\+/g, ' ');

		// Try the built in decoder first
		return decodeURIComponent(encodedURI);
	} catch (err) {
		// Fallback to a more advanced decoder
		return customDecodeURIComponent(encodedURI);
	}
};

function encoderForArrayFormat(opts) {
	switch (opts.arrayFormat) {
		case 'index':
			return function (key, value, index) {
				return value === null ? [
					encode(key, opts),
					'[',
					index,
					']'
				].join('') : [
					encode(key, opts),
					'[',
					encode(index, opts),
					']=',
					encode(value, opts)
				].join('');
			};

		case 'bracket':
			return function (key, value) {
				return value === null ? encode(key, opts) : [
					encode(key, opts),
					'[]=',
					encode(value, opts)
				].join('');
			};

		default:
			return function (key, value) {
				return value === null ? encode(key, opts) : [
					encode(key, opts),
					'=',
					encode(value, opts)
				].join('');
			};
	}
}

function parserForArrayFormat(opts) {
	var result;

	switch (opts.arrayFormat) {
		case 'index':
			return function (key, value, accumulator) {
				result = /\[(\d*)\]$/.exec(key);

				key = key.replace(/\[\d*\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				}

				if (accumulator[key] === undefined) {
					accumulator[key] = {};
				}

				accumulator[key][result[1]] = value;
			};

		case 'bracket':
			return function (key, value, accumulator) {
				result = /(\[\])$/.exec(key);
				key = key.replace(/\[\]$/, '');

				if (!result) {
					accumulator[key] = value;
					return;
				} else if (accumulator[key] === undefined) {
					accumulator[key] = [value];
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};

		default:
			return function (key, value, accumulator) {
				if (accumulator[key] === undefined) {
					accumulator[key] = value;
					return;
				}

				accumulator[key] = [].concat(accumulator[key], value);
			};
	}
}

function encode(value, opts) {
	if (opts.encode) {
		return opts.strict ? strictUriEncode(value) : encodeURIComponent(value);
	}

	return value;
}

function keysSorter(input) {
	if (Array.isArray(input)) {
		return input.sort();
	} else if (typeof input === 'object') {
		return keysSorter(Object.keys(input)).sort(function (a, b) {
			return Number(a) - Number(b);
		}).map(function (key) {
			return input[key];
		});
	}

	return input;
}

var extract = function (str) {
	var queryStart = str.indexOf('?');
	if (queryStart === -1) {
		return '';
	}
	return str.slice(queryStart + 1);
};

var parse = function (str, opts) {
	opts = objectAssign({arrayFormat: 'none'}, opts);

	var formatter = parserForArrayFormat(opts);

	// Create an object with no prototype
	// https://github.com/sindresorhus/query-string/issues/47
	var ret = Object.create(null);

	if (typeof str !== 'string') {
		return ret;
	}

	str = str.trim().replace(/^[?#&]/, '');

	if (!str) {
		return ret;
	}

	str.split('&').forEach(function (param) {
		var parts = param.replace(/\+/g, ' ').split('=');
		// Firefox (pre 40) decodes `%3D` to `=`
		// https://github.com/sindresorhus/query-string/pull/37
		var key = parts.shift();
		var val = parts.length > 0 ? parts.join('=') : undefined;

		// missing `=` should be `null`:
		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
		val = val === undefined ? null : decodeUriComponent(val);

		formatter(decodeUriComponent(key), val, ret);
	});

	return Object.keys(ret).sort().reduce(function (result, key) {
		var val = ret[key];
		if (Boolean(val) && typeof val === 'object' && !Array.isArray(val)) {
			// Sort object keys, not values
			result[key] = keysSorter(val);
		} else {
			result[key] = val;
		}

		return result;
	}, Object.create(null));
};

var stringify = function (obj, opts) {
	var defaults = {
		encode: true,
		strict: true,
		arrayFormat: 'none'
	};

	opts = objectAssign(defaults, opts);

	var formatter = encoderForArrayFormat(opts);

	return obj ? Object.keys(obj).sort().map(function (key) {
		var val = obj[key];

		if (val === undefined) {
			return '';
		}

		if (val === null) {
			return encode(key, opts);
		}

		if (Array.isArray(val)) {
			var result = [];

			val.slice().forEach(function (val2) {
				if (val2 === undefined) {
					return;
				}

				result.push(formatter(key, val2, result.length));
			});

			return result.join('&');
		}

		return encode(key, opts) + '=' + encode(val, opts);
	}).filter(function (x) {
		return x.length > 0;
	}).join('&') : '';
};

var queryString = {
	extract: extract,
	parse: parse,
	stringify: stringify
};

var coincrowdQR = function coincrowdQR(_ref, qrcodeOpts) {
  var address = _ref.address,
      _ref$coin = _ref.coin,
      coin = _ref$coin === undefined ? 'ETH' : _ref$coin,
      value = _ref.value,
      gas = _ref.gas,
      data = _ref.data;

  var qs = queryString.stringify({ value: value, gas: gas, data: data });
  var ccUri = 'ethereum:' + address + '?' + qs;
  console.log(ccUri);
  var qr = new qrcode(0, 'H');
  qr.addData(ccUri);
  qr.make();
  var ccDiv = document.getElementById('coincrowdQR');
  ccDiv.innerHTML = qr.createSvgTag({});
};

return coincrowdQR;

}());
