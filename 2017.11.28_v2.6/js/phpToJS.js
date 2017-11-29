(function (utilities) {
    
    var replaceAt = function(str, index, replacement) {
        return str.substr(0, index) + replacement + str.substr(index + replacement.length);
    };
      
          
    var unpack = function(format, data) {
        
          // http://kevin.vanzonneveld.net
          // +   original by: Tim de Koning (http://www.kingsquare.nl)
          // +      parts by: Jonas Raoni Soares Silva - http://www.jsfromhell.com
          // +      parts by: Joshua Bell - http://cautionsingularityahead.blogspot.nl/
          // +
          // +   bugfixed by: marcuswestin
          // %        note 1: Float decoding by: Jonas Raoni Soares Silva
          // %        note 2: Home: http://www.kingsquare.nl/blog/22-12-2009/13650536
          // %        note 3: Feedback: phpjs-unpack@kingsquare.nl
          // %        note 4: 'machine dependant byte order and size' aren't
          // %        note 5: applicable for JavaScript unpack works as on a 32bit,
          // %        note 6: little endian machine
          // *     example 1: unpack('d', "\u0000\u0000\u0000\u0000\u00008YÀ");
          // *     returns 1: { "": -100.875 }

          var formatPointer = 0, dataPointer = 0, result = {}, instruction = '',
              quantifier = '', label = '', currentData = '', i = 0, j = 0,
              word = '', fbits = 0, ebits = 0, dataByteLength = 0;

          // Used by float decoding - by Joshua Bell
            //http://cautionsingularityahead.blogspot.nl/2010/04/javascript-and-ieee754-redux.html
          var fromIEEE754 = function(bytes, ebits, fbits) {
            // Bytes to bits
            var bits = [];
            for (var i = bytes.length; i; i -= 1) {
              var byte = bytes[i - 1];
              for (var j = 8; j; j -= 1) {
                bits.push(byte % 2 ? 1 : 0); byte = byte >> 1;
              }
            }
            bits.reverse();
            var str = bits.join('');

            // Unpack sign, exponent, fraction
            var bias = (1 << (ebits - 1)) - 1;
            var s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
            var e = parseInt(str.substring(1, 1 + ebits), 2);
            var f = parseInt(str.substring(1 + ebits), 2);

            // Produce number
            if (e === (1 << ebits) - 1) {
              return f !== 0 ? NaN : s * Infinity;
            }
            else if (e > 0) {
              return s * Math.pow(2, e - bias) * (1 + f / Math.pow(2, fbits));
            }
            else if (f !== 0) {
              return s * Math.pow(2, -(bias-1)) * (f / Math.pow(2, fbits));
            }
            else {
              return s * 0;
            }
          }

          while (formatPointer < format.length) {
            instruction = format.charAt(formatPointer);

            // Start reading 'quantifier'
            quantifier = '';
            formatPointer++;
            while ((formatPointer < format.length) &&
                (format.charAt(formatPointer).match(/[\d\*]/) !== null)) {
              quantifier += format.charAt(formatPointer);
              formatPointer++;
            }
            if (quantifier === '') {
              quantifier = '1';
            }


            // Start reading label
            label = '';
            while ((formatPointer < format.length) &&
                (format.charAt(formatPointer) !== '/')) {
              label += format.charAt(formatPointer);
              formatPointer++;
            }
            if (format.charAt(formatPointer) === '/') {
              formatPointer++;
            }

            // Process given instruction
            switch (instruction) {
              case 'a': // NUL-padded string
              case 'A': // SPACE-padded string
                if (quantifier === '*') {
                  quantifier = data.length - dataPointer;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }
                currentData = data.substr(dataPointer, quantifier);
                dataPointer += quantifier;

                if (instruction === 'a') {
                  currentResult = currentData.replace(/\0+$/, '');
                } else {
                  currentResult = currentData.replace(/ +$/, '');
                }
                result[label] = currentResult;
                break;

              case 'h': // Hex string, low nibble first
              case 'H': // Hex string, high nibble first
                if (quantifier === '*') {
                  quantifier = data.length - dataPointer;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }
                currentData = data.substr(dataPointer, quantifier);
                dataPointer += quantifier;

                if (quantifier > currentData.length) {
                  throw new Error('Warning: unpack(): Type ' + instruction +
                      ': not enough input, need ' + quantifier);
                }

                currentResult = '';
                for (i = 0; i < currentData.length; i++) {
                  word = currentData.charCodeAt(i).toString(16);
                  if (instruction === 'h') {
                    word = word[1] + word[0];
                  }
                  currentResult += word;
                }
                result[label] = currentResult;
                break;

              case 'c': // signed char
              case 'C': // unsigned c
                if (quantifier === '*') {
                  quantifier = data.length - dataPointer;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }

                currentData = data.substr(dataPointer, quantifier);
                dataPointer += quantifier;

                for (i = 0; i < currentData.length; i++) {
                  currentResult = currentData.charCodeAt(i);
                  if ((instruction === 'c') && (currentResult >= 128)) {
                    currentResult -= 256;
                  }
                  result[label + (quantifier > 1 ?
                      (i + 1) :
                      '')] = currentResult;
                }
                break;

              case 'S': // unsigned short (always 16 bit, machine byte order)
              case 's': // signed short (always 16 bit, machine byte order)
              case 'v': // unsigned short (always 16 bit, little endian byte order)
                if (quantifier === '*') {
                  quantifier = (data.length - dataPointer) / 2;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }

                currentData = data.substr(dataPointer, quantifier * 2);
                dataPointer += quantifier * 2;

                for (i = 0; i < currentData.length; i += 2) {
                  // sum per word;
                  currentResult = ((currentData.charCodeAt(i + 1) & 0xFF) << 8) +
                      (currentData.charCodeAt(i) & 0xFF);
                  if ((instruction === 's') && (currentResult >= 32768)) {
                    currentResult -= 65536;
                  }
                  result[label + (quantifier > 1 ?
                      ((i / 2) + 1) :
                      '')] = currentResult;
                }
                break;

              case 'n': // unsigned short (always 16 bit, big endian byte order)
                if (quantifier === '*') {
                  quantifier = (data.length - dataPointer) / 2;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }

                currentData = data.substr(dataPointer, quantifier * 2);
                dataPointer += quantifier * 2;

                for (i = 0; i < currentData.length; i += 2) {
                  // sum per word;
                  currentResult = ((currentData.charCodeAt(i) & 0xFF) << 8) +
                      (currentData.charCodeAt(i + 1) & 0xFF);
                  result[label + (quantifier > 1 ?
                      ((i / 2) + 1) :
                      '')] = currentResult;
                }
                break;

              case 'i': // signed integer (machine dependent size and byte order)
              case 'I': // unsigned integer (machine dependent size & byte order)
              case 'l': // signed long (always 32 bit, machine byte order)
              case 'L': // unsigned long (always 32 bit, machine byte order)
              case 'V': // unsigned long (always 32 bit, little endian byte order)
                if (quantifier === '*') {
                  quantifier = (data.length - dataPointer) / 4;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }

                currentData = data.substr(dataPointer, quantifier * 4);
                dataPointer += quantifier * 4;

                for (i = 0; i < currentData.length; i += 4) {
                  currentResult =
                      ((currentData.charCodeAt(i + 3) & 0xFF) << 24) +
                      ((currentData.charCodeAt(i + 2) & 0xFF) << 16) +
                      ((currentData.charCodeAt(i + 1) & 0xFF) << 8) +
                      ((currentData.charCodeAt(i) & 0xFF));
                  result[label + (quantifier > 1 ?
                      ((i / 4) + 1) :
                      '')] = currentResult;
                }

                break;

              case 'N': // unsigned long (always 32 bit, little endian byte order)
                if (quantifier === '*') {
                  quantifier = (data.length - dataPointer) / 4;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }

                currentData = data.substr(dataPointer, quantifier * 4);
                dataPointer += quantifier * 4;

                for (i = 0; i < currentData.length; i += 4) {
                  currentResult =
                      ((currentData.charCodeAt(i) & 0xFF) << 24) +
                      ((currentData.charCodeAt(i + 1) & 0xFF) << 16) +
                      ((currentData.charCodeAt(i + 2) & 0xFF) << 8) +
                      ((currentData.charCodeAt(i + 3) & 0xFF));
                  result[label + (quantifier > 1 ?
                      ((i / 4) + 1) :
                      '')] = currentResult;
                }

                break;

              case 'f': //float
              case 'd': //double
                ebits = 8;
                fbits = (instruction === 'f') ? 23 : 52;
                dataByteLength = 4;
                if (instruction === 'd') {
                  ebits = 11;
                  dataByteLength = 8;
                }

                if (quantifier === '*') {
                  quantifier = (data.length - dataPointer) / dataByteLength;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }

                currentData = data.substr(dataPointer, quantifier * dataByteLength);
                dataPointer += quantifier * dataByteLength;

                for (i = 0; i < currentData.length; i += dataByteLength) {
                  data = currentData.substr(i, dataByteLength);

                  bytes = [];
                  for (j = data.length - 1; j >= 0; --j) {
                    bytes.push(data.charCodeAt(j));
                  }
                  result[label + (quantifier > 1 ?
                      ((i / 4) + 1) :
                      '')] = fromIEEE754(bytes, ebits, fbits);
                }

                break;

              case 'x': // NUL byte
              case 'X': // Back up one byte
              case '@': // NUL byte
                if (quantifier === '*') {
                  quantifier = data.length - dataPointer;
                } else {
                  quantifier = parseInt(quantifier, 10);
                }

                if (quantifier > 0) {
                  if (instruction === 'X') {
                    dataPointer -= quantifier;
                  } else {
                    if (instruction === 'x') {
                      dataPointer += quantifier;
                    } else {
                      dataPointer = quantifier;
                    }
                  }
                }
                break;

              default:
                throw new Error('Warning:  unpack() Type ' + instruction +
                    ': unknown format code');
            }
        }
        return result;
    };    
    
    var pack = function (format) {
      //  discuss at: http://locutus.io/php/pack/
      // original by: Tim de Koning (http://www.kingsquare.nl)
      //    parts by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
      // bugfixed by: Tim de Koning (http://www.kingsquare.nl)
      //      note 1: Float encoding by: Jonas Raoni Soares Silva
      //      note 1: Home: http://www.kingsquare.nl/blog/12-12-2009/13507444
      //      note 1: Feedback: phpjs-pack@kingsquare.nl
      //      note 1: "machine dependent byte order and size" aren't
      //      note 1: applicable for JavaScript; pack works as on a 32bit,
      //      note 1: little endian machine.
      //   example 1: pack('nvc*', 0x1234, 0x5678, 65, 66)
      //   returns 1: '\u00124xVAB'
      //   example 2: pack('H4', '2345')
      //   returns 2: '#E'
      //   example 3: pack('H*', 'D5')
      //   returns 3: 'Õ'
      //   example 4: pack('d', -100.876)
      //   returns 4: "\u0000\u0000\u0000\u0000\u00008YÀ"
      //        test: skip-1

      var formatPointer = 0
      var argumentPointer = 1
      var result = ''
      var argument = ''
      var i = 0
      var r = []
      var instruction, quantifier, word, precisionBits, exponentBits, extraNullCount

      // vars used by float encoding
      var bias
      var minExp
      var maxExp
      var minUnnormExp
      var status
      var exp
      var len
      var bin
      var signal
      var n
      var intPart
      var floatPart
      var lastBit
      var rounded
      var j
      var k
      var tmpResult

      while (formatPointer < format.length) {
        instruction = format.charAt(formatPointer)
        quantifier = ''
        formatPointer++
        while ((formatPointer < format.length) && (format.charAt(formatPointer)
            .match(/[\d*]/) !== null)) {
          quantifier += format.charAt(formatPointer)
          formatPointer++
        }
        if (quantifier === '') {
          quantifier = '1'
        }

        // Now pack variables: 'quantifier' times 'instruction'
        switch (instruction) {
          case 'a':
          case 'A':
            // NUL-padded string
            // SPACE-padded string
            if (typeof arguments[argumentPointer] === 'undefined') {
              throw new Error('Warning:  pack() Type ' + instruction + ': not enough arguments')
            } else {
              argument = String(arguments[argumentPointer])
            }
            if (quantifier === '*') {
              quantifier = argument.length
            }
            for (i = 0; i < quantifier; i++) {
              if (typeof argument[i] === 'undefined') {
                if (instruction === 'a') {
                  result += String.fromCharCode(0)
                } else {
                  result += ' '
                }
              } else {
                result += argument[i]
              }
            }
            argumentPointer++
            break
          case 'h':
          case 'H':
            // Hex string, low nibble first
            // Hex string, high nibble first
            if (typeof arguments[argumentPointer] === 'undefined') {
              throw new Error('Warning: pack() Type ' + instruction + ': not enough arguments')
            } else {
              argument = arguments[argumentPointer]
            }
            if (quantifier === '*') {
              quantifier = argument.length
            }
            if (quantifier > argument.length) {
              var msg = 'Warning: pack() Type ' + instruction + ': not enough characters in string'
              throw new Error(msg)
            }

            for (i = 0; i < quantifier; i += 2) {
              // Always get per 2 bytes...
              word = argument[i]
              if (((i + 1) >= quantifier) || typeof argument[i + 1] === 'undefined') {
                word += '0'
              } else {
                word += argument[i + 1]
              }
              // The fastest way to reverse?
              if (instruction === 'h') {
                word = word[1] + word[0]
              }
              result += String.fromCharCode(parseInt(word, 16))
            }
            argumentPointer++
            break

          case 'c':
          case 'C':
            // signed char
            // unsigned char
            // c and C is the same in pack
            if (quantifier === '*') {
              quantifier = arguments.length - argumentPointer
            }
            if (quantifier > (arguments.length - argumentPointer)) {
              throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
            }

            for (i = 0; i < quantifier; i++) {
              result += String.fromCharCode(arguments[argumentPointer])
              argumentPointer++
            }
            break

          case 's':
          case 'S':
          case 'v':
            // signed short (always 16 bit, machine byte order)
            // unsigned short (always 16 bit, machine byte order)
            // s and S is the same in pack
            if (quantifier === '*') {
              quantifier = arguments.length - argumentPointer
            }
            if (quantifier > (arguments.length - argumentPointer)) {
              throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
            }

            for (i = 0; i < quantifier; i++) {
              result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
              argumentPointer++
            }
            break

          case 'n':
            // unsigned short (always 16 bit, big endian byte order)
            if (quantifier === '*') {
              quantifier = arguments.length - argumentPointer
            }
            if (quantifier > (arguments.length - argumentPointer)) {
              throw new Error('Warning: pack() Type ' + instruction + ': too few arguments')
            }

            for (i = 0; i < quantifier; i++) {
              result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
              argumentPointer++
            }
            break

          case 'i':
          case 'I':
          case 'l':
          case 'L':
          case 'V':
            // signed integer (machine dependent size and byte order)
            // unsigned integer (machine dependent size and byte order)
            // signed long (always 32 bit, machine byte order)
            // unsigned long (always 32 bit, machine byte order)
            // unsigned long (always 32 bit, little endian byte order)
            if (quantifier === '*') {
              quantifier = arguments.length - argumentPointer
            }
            if (quantifier > (arguments.length - argumentPointer)) {
              throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
            }

            for (i = 0; i < quantifier; i++) {
              result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] >> 16 & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] >> 24 & 0xFF)
              argumentPointer++
            }

            break
          case 'N':
            // unsigned long (always 32 bit, big endian byte order)
            if (quantifier === '*') {
              quantifier = arguments.length - argumentPointer
            }
            if (quantifier > (arguments.length - argumentPointer)) {
              throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
            }

            for (i = 0; i < quantifier; i++) {
              result += String.fromCharCode(arguments[argumentPointer] >> 24 & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] >> 16 & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] >> 8 & 0xFF)
              result += String.fromCharCode(arguments[argumentPointer] & 0xFF)
              argumentPointer++
            }
            break

          case 'f':
          case 'd':
            // float (machine dependent size and representation)
            // double (machine dependent size and representation)
            // version based on IEEE754
            precisionBits = 23
            exponentBits = 8
            if (instruction === 'd') {
              precisionBits = 52
              exponentBits = 11
            }

            if (quantifier === '*') {
              quantifier = arguments.length - argumentPointer
            }
            if (quantifier > (arguments.length - argumentPointer)) {
              throw new Error('Warning:  pack() Type ' + instruction + ': too few arguments')
            }
            for (i = 0; i < quantifier; i++) {
              argument = arguments[argumentPointer]
              bias = Math.pow(2, exponentBits - 1) - 1
              minExp = -bias + 1
              maxExp = bias
              minUnnormExp = minExp - precisionBits
              status = isNaN(n = parseFloat(argument)) || n === -Infinity || n === +Infinity ? n : 0
              exp = 0
              len = 2 * bias + 1 + precisionBits + 3
              bin = new Array(len)
              signal = (n = status !== 0 ? 0 : n) < 0
              n = Math.abs(n)
              intPart = Math.floor(n)
              floatPart = n - intPart

              for (k = len; k;) {
                bin[--k] = 0
              }
              for (k = bias + 2; intPart && k;) {
                bin[--k] = intPart % 2
                intPart = Math.floor(intPart / 2)
              }
              for (k = bias + 1; floatPart > 0 && k; --floatPart) {
                (bin[++k] = ((floatPart *= 2) >= 1) - 0)
              }
              for (k = -1; ++k < len && !bin[k];) {}

              // @todo: Make this more readable:
              var key = (lastBit = precisionBits - 1 +
                (k =
                  (exp = bias + 1 - k) >= minExp &&
                  exp <= maxExp ? k + 1 : bias + 1 - (exp = minExp - 1))) + 1

              if (bin[key]) {
                if (!(rounded = bin[lastBit])) {
                  for (j = lastBit + 2; !rounded && j < len; rounded = bin[j++]) {}
                }
                for (j = lastBit + 1; rounded && --j >= 0;
                (bin[j] = !bin[j] - 0) && (rounded = 0)) {}
              }

              for (k = k - 2 < 0 ? -1 : k - 3; ++k < len && !bin[k];) {}

              if ((exp = bias + 1 - k) >= minExp && exp <= maxExp) {
                ++k
              } else {
                if (exp < minExp) {
                  if (exp !== bias + 1 - len && exp < minUnnormExp) {
                    // "encodeFloat::float underflow"
                  }
                  k = bias + 1 - (exp = minExp - 1)
                }
              }

              if (intPart || status !== 0) {
                exp = maxExp + 1
                k = bias + 2
                if (status === -Infinity) {
                  signal = 1
                } else if (isNaN(status)) {
                  bin[k] = 1
                }
              }

              n = Math.abs(exp + bias)
              tmpResult = ''

              for (j = exponentBits + 1; --j;) {
                tmpResult = (n % 2) + tmpResult
                n = n >>= 1
              }

              n = 0
              j = 0
              k = (tmpResult = (signal ? '1' : '0') + tmpResult + (bin
                .slice(k, k + precisionBits)
                .join(''))
              ).length
              r = []

              for (; k;) {
                n += (1 << j) * tmpResult.charAt(--k)
                if (j === 7) {
                  r[r.length] = String.fromCharCode(n)
                  n = 0
                }
                j = (j + 1) % 8
              }

              r[r.length] = n ? String.fromCharCode(n) : ''
              result += r.join('')
              argumentPointer++
            }
            break

          case 'x':
            // NUL byte
            if (quantifier === '*') {
              throw new Error('Warning: pack(): Type x: \'*\' ignored')
            }
            for (i = 0; i < quantifier; i++) {
              result += String.fromCharCode(0)
            }
            break

          case 'X':
            // Back up one byte
            if (quantifier === '*') {
              throw new Error('Warning: pack(): Type X: \'*\' ignored')
            }
            for (i = 0; i < quantifier; i++) {
              if (result.length === 0) {
                throw new Error('Warning: pack(): Type X:' + ' outside of string')
              } else {
                result = result.substring(0, result.length - 1)
              }
            }
            break

          case '@':
            // NUL-fill to absolute position
            if (quantifier === '*') {
              throw new Error('Warning: pack(): Type X: \'*\' ignored')
            }
            if (quantifier > result.length) {
              extraNullCount = quantifier - result.length
              for (i = 0; i < extraNullCount; i++) {
                result += String.fromCharCode(0)
              }
            }
            if (quantifier < result.length) {
              result = result.substring(0, quantifier)
            }
            break

          default:
            throw new Error('Warning: pack() Type ' + instruction + ': unknown format code')
        }
      }
      if (argumentPointer < arguments.length) {
        var msg2 = 'Warning: pack(): ' + (arguments.length - argumentPointer) + ' arguments unused'
        throw new Error(msg2)
      }

      return result
    };
    
    var sprintf = function () {
        //  discuss at: http://locutus.io/php/sprintf/
        // original by: Ash Searle (http://hexmen.com/blog/)
        // improved by: Michael White (http://getsprink.com)
        // improved by: Jack
        // improved by: Kevin van Zonneveld (http://kvz.io)
        // improved by: Kevin van Zonneveld (http://kvz.io)
        // improved by: Kevin van Zonneveld (http://kvz.io)
        // improved by: Dj
        // improved by: Allidylls
        //    input by: Paulo Freitas
        //    input by: Brett Zamir (http://brett-zamir.me)
        //   example 1: sprintf("%01.2f", 123.1)
        //   returns 1: '123.10'
        //   example 2: sprintf("[%10s]", 'monkey')
        //   returns 2: '[    monkey]'
        //   example 3: sprintf("[%'#10s]", 'monkey')
        //   returns 3: '[####monkey]'
        //   example 4: sprintf("%d", 123456789012345)
        //   returns 4: '123456789012345'
        //   example 5: sprintf('%-03s', 'E')
        //   returns 5: 'E00'

        var regex = /%%|%(\d+\$)?([-+'#0 ]*)(\*\d+\$|\*|\d+)?(?:\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
        var a = arguments;
        var i = 0;
        var format = a[i++];

        var _pad = function (str, len, chr, leftJustify) {
            if (!chr) {
                chr = ' '
            }
            var padding = (str.length >= len) ? '' : new Array(1 + len - str.length >>> 0).join(chr);
            return leftJustify ? str + padding : padding + str
        };

        var justify = function (value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
            var diff = minWidth - value.length;
            if (diff > 0) {
                if (leftJustify || !zeroPad) {
                    value = _pad(value, minWidth, customPadChar, leftJustify)
                } else {
                    value = [
                        value.slice(0, prefix.length),
                        _pad('', diff, '0', true),
                        value.slice(prefix.length)
                    ].join('')
                }
            }
            return value
        };

        var _formatBaseX = function (value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
            // Note: casts negative numbers to positive ones
            var number = value >>> 0;
            prefix = (prefix && number && {
                    '2': '0b',
                    '8': '0',
                    '16': '0x'
                }[base]) || '';
            value = prefix + _pad(number.toString(base), precision || 0, '0', false);
            return justify(value, prefix, leftJustify, minWidth, zeroPad)
        };

        // _formatString()
        var _formatString = function (value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
            if (precision !== null && precision !== undefined) {
                value = value.slice(0, precision)
            }
            return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar)
        };

        // doFormat()
        var doFormat = function (substring, valueIndex, flags, minWidth, precision, type) {
            var number, prefix, method, textTransform, value;

            if (substring === '%%') {
                return '%'
            }

            // parse flags
            var leftJustify = false;
            var positivePrefix = '';
            var zeroPad = false;
            var prefixBaseX = false;
            var customPadChar = ' ';
            var flagsl = flags.length;
            var j;
            for (j = 0; j < flagsl; j++) {
                switch (flags.charAt(j)) {
                    case ' ':
                        positivePrefix = ' ';
                        break;
                    case '+':
                        positivePrefix = '+';
                        break;
                    case '-':
                        leftJustify = true;
                        break;
                    case "'":
                        customPadChar = flags.charAt(j + 1);
                        break;
                    case '0':
                        zeroPad = true;
                        customPadChar = '0';
                        break;
                    case '#':
                        prefixBaseX = true;
                        break
                }
            }

            // parameters may be null, undefined, empty-string or real valued
            // we want to ignore null, undefined and empty-string values
            if (!minWidth) {
                minWidth = 0
            } else if (minWidth === '*') {
                minWidth = +a[i++]
            } else if (minWidth.charAt(0) === '*') {
                minWidth = +a[minWidth.slice(1, -1)]
            } else {
                minWidth = +minWidth
            }

            // Note: undocumented perl feature:
            if (minWidth < 0) {
                minWidth = -minWidth;
                leftJustify = true
            }

            if (!isFinite(minWidth)) {
                throw new Error('sprintf: (minimum-)width must be finite')
            }

            if (!precision) {
                precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type === 'd') ? 0 : undefined
            } else if (precision === '*') {
                precision = +a[i++]
            } else if (precision.charAt(0) === '*') {
                precision = +a[precision.slice(1, -1)]
            } else {
                precision = +precision
            }

            // grab value using valueIndex if required?
            value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

            switch (type) {
                case 's':
                    return _formatString(value + '', leftJustify, minWidth, precision, zeroPad, customPadChar);
                case 'c':
                    return _formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
                case 'b':
                    return _formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'o':
                    return _formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'x':
                    return _formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'X':
                    return _formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad)
                        .toUpperCase();
                case 'u':
                    return _formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
                case 'i':
                case 'd':
                    number = +value || 0;
                    // Plain Math.round doesn't just truncate
                    number = Math.round(number - number % 1);
                    prefix = number < 0 ? '-' : positivePrefix;
                    value = prefix + _pad(String(Math.abs(number)), precision, '0', false);
                    return justify(value, prefix, leftJustify, minWidth, zeroPad);
                case 'e':
                case 'E':
                case 'f': // @todo: Should handle locales (as per setlocale)
                case 'F':
                case 'g':
                case 'G':
                    number = +value;
                    prefix = number < 0 ? '-' : positivePrefix;
                    method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
                    textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
                    value = prefix + Math.abs(number)[method](precision);
                    return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
                default:
                    return substring
            }
        };

        return format.replace(regex, doFormat)
    };
    
//    var bcadd = function(leftOperand, rightOperand, scale) {
//        //  discuss at: http://locutus.io/php/bcadd/
//        // original by: lmeyrick (https://sourceforge.net/projects/bcmath-js/)
//        //   example 1: bcadd('1', '2')
//        //   returns 1: '3'
//        //   example 2: bcadd('-1', '5', 4)
//        //   returns 2: '4.0000'
//        //   example 3: bcadd('1928372132132819737213', '8728932001983192837219398127471', 2)
//        //   returns 3: '8728932003911564969352217864684.00'
//
//        //var bc = require('../_helpers/_bc')
//        var libbcmath = bc();
//
//        var first, second, result;
//
//        if (typeof scale === 'undefined') {
//            scale = libbcmath.scale
//        }
//        scale = ((scale < 0) ? 0 : scale);
//
//        // create objects
//        first = libbcmath.bc_init_num();
//        second = libbcmath.bc_init_num();
//        result = libbcmath.bc_init_num();
//
//        first = libbcmath.php_str2num(leftOperand.toString());
//        second = libbcmath.php_str2num(rightOperand.toString());
//
//        result = libbcmath.bc_add(first, second, scale);
//
//        if (result.n_scale > scale) {
//            result.n_scale = scale
//        }
//
//        return result.toString()
//    };

//    var bcmul = function(leftOperand, rightOperand, scale) {
//        //  discuss at: http://locutus.io/php/bcmul/
//        // original by: lmeyrick (https://sourceforge.net/projects/bcmath-js/)
//        //   example 1: bcmul('1', '2')
//        //   returns 1: '2'
//        //   example 2: bcmul('-3', '5')
//        //   returns 2: '-15'
//        //   example 3: bcmul('1234567890', '9876543210')
//        //   returns 3: '12193263111263526900'
//        //   example 4: bcmul('2.5', '1.5', 2)
//        //   returns 4: '3.75'
//
//        //var _bc = require('../_helpers/_bc')
//        var libbcmath = bc();
//
//        var first, second, result;
//
//        if (typeof scale === 'undefined') {
//            scale = libbcmath.scale
//        }
//        scale = ((scale < 0) ? 0 : scale);
//
//        // create objects
//        first = libbcmath.bc_init_num();
//        second = libbcmath.bc_init_num();
//        result = libbcmath.bc_init_num();
//
//        first = libbcmath.php_str2num(leftOperand.toString());
//        second = libbcmath.php_str2num(rightOperand.toString());
//
//        result = libbcmath.bc_multiply(first, second, scale);
//
//        if (result.n_scale > scale) {
//            result.n_scale = scale
//        }
//        return result.toString()
//    };

     utilities.getStringFromCharCode = function(arr, from, len) {
        
        let result = '';
        for(let i = 0; i < len; i++) {
            let ind = i + from;
            result += String.fromCharCode(arr[ind]);
        }
        return result;
    };
    
    
    // Binary safe case-insensitive string comparison of the first n characters
    utilities.strncasecmp = function (f_string1, f_string2, len) {


        var string1 = f_string1.toLowerCase().substr(0, len);
        var string2 = f_string2.toLowerCase().substr(0, len);

        if(string1 > string2) {
            return 1;
        }
        else if(string1 == string2) {
            return 0;
        }

        return -1;
    };

    // Binary safe case-insensitive string comparison
    utilities.strcasecmp = function (f_string1, f_string2) {
        //
        // +	 original by: Martijn Wieringa

        var string1 = f_string1.toLowerCase();
        var string2 = f_string2.toLowerCase();

        if(string1 > string2) {
            return 1;
        }
        else if(string1 == string2) {
            return 0;
        }

        return -1;
    };
    
   
    utilities.array_pop = function(array) {	// Pop the element off the end of array
        //
        // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)

        // done popping, are we?
        if( !array.length ){
            return null;
        }

        return array.pop();
    };

    utilities.array_push = function(array) {	// Push one or more elements onto the end of array
        //
        // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)

        var i, argv = arguments, argc = argv.length;

        for (i=1; i < argc; i++){
            array[array.length++] = argv[i];
        }

        return array.length;
    };

    utilities.implode = function(glue, pieces) {	// Join array elements with a string
        //
        // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
        // +   improved by: _argos

        return ( ( pieces instanceof Array ) ? pieces.join ( glue ) : pieces );
    };
    
    
    utilities.readInt32 = function (str, pos) {
        var int32 = unpack('N', str.substr(pos, 4));
        return Object.values(int32)[0];
    };
    
    utilities.readInt32Array = function (arr, pos) {        
        var str = utilities.getStringFromCharCode(arr, pos, 4);
        var int32 = unpack('N', str);
        return Object.values(int32)[0];
    };
    
    utilities.writeInt32 = function(str, pos, int) {
                
        str = replaceAt(str, pos, pack('C', (int & 0xFF000000) >> 24));
        str = replaceAt(str, pos + 1, pack('C', (int & 0xFF0000) >> 16));
        str = replaceAt(str, pos + 2, pack('C', (int & 0xFF00) >> 8));
        str = replaceAt(str, pos + 3, pack('C', int & 0xFF));

        return str;
    };
    
    
    utilities.writeInt32Array = function(arr, int) {
        
//        arr[pos] = pack('C', (int & 0xFF000000) >> 24);
//        arr[pos + 1] = pack('C', (int & 0xFF0000) >> 16);
//        arr[pos + 2] = pack('C', (int & 0xFF00) >> 8);
//        arr[pos + 3] = pack('C', int & 0xFF);
//        
//        return arr;
    };
    
    
    utilities.readByte = function(str, pos) {        
        var int = unpack('C', str.charAt(pos));
        return Object.values(int)[0];
    };
    
    utilities.readByteArray = function(arr, pos) { 
        var str = utilities.getStringFromCharCode(arr, pos, 1);
        var int = unpack('C', str);
        return Object.values(int)[0];
    };
    
    utilities.writeByte = function(str, pos, int) {
        if (str.length == 0) {
            str = pack('C', int);
        }
        else {
            str = replaceAt(str, pos, pack('C', int));
        }
        return str;
    };

    utilities.readInt24 = function(str, pos) {
        var int32 = unpack('N', "\x00" + str.substr(pos, 3));
        return Object.values(int32)[0];
    };
    
    utilities.readInt24Array = function(arr, pos) {
        var str = utilities.getStringFromCharCode(arr, pos, 3);
        var int32 = unpack('N', "\x00" + str);
        return Object.values(int32)[0];
    };
    
    utilities.writeInt24 = function(str, pos, int) {
               
        str = replaceAt(str, pos, pack('C', (int & 0xFF0000) >> 16));
        str = replaceAt(str, pos + 1, pack('C', (int & 0xFF00) >> 8));
        str = replaceAt(str, pos + 2, pack('C', int & 0xFF));

        return str;
    };
    
  

    utilities.readInt64 = function(str, pos) {
        var hi = sprintf("%u", utilities.readInt32(str, pos));
        var lo    = sprintf("%u", utilities.readInt32(str, pos + 4));
        var int64 =0; //bcadd(bcmul(hi, "4294967296"), lo);
        return int64;
    };
    
    utilities.readInt64Array = function(arr, pos) {
        var hi = sprintf("%u", utilities.readInt32Array(arr, pos));
        var lo    = sprintf("%u", utilities.readInt32Array(arr, pos + 4));
        var int64 =0; //bcadd(bcmul(hi, "4294967296"), lo);
        return int64;
    };
    
    
    
    utilities.readString = function(bootstrapInfo, obj) {
        var len = 0;
        while (bootstrapInfo[obj.pos + len] != "\x00")
            len++;
        bootstrapInfo = bootstrapInfo.substr(obj.pos, len);
        obj.pos += len + 1;        
        return bootstrapInfo;
    };
    

    utilities.simplexml_load_string = function (obj) {
                
        var simpleXmlObj = {};
        simpleXmlObj.media = [];

        var manifestXml = obj.children[0];

        for (var i = 0; i < manifestXml.children.length; i++) {

            var curItem = manifestXml.children[i];
            
            if (manifestXml.children[i].localName === 'baseURL') {
                simpleXmlObj.baseurl = curItem.innerHTML;
            }
            
            if (manifestXml.children[i].localName === 'id') {
                simpleXmlObj.id = curItem.innerHTML;
            }
            if (manifestXml.children[i].localName === 'streamType') {
                simpleXmlObj.streamType = curItem.innerHTML;
            }
            if (manifestXml.children[i].localName === 'duration') {
                simpleXmlObj.duration = curItem.innerHTML;
            }
            if (manifestXml.children[i].localName === 'bootstrapInfo') {
                simpleXmlObj.bootstrapInfo = curItem.innerHTML;
            }
            if (manifestXml.children[i].localName === 'media') {
                var curMediaObj = {};
                for (var z = 0; z < curItem.children.length; z++) {
                    if (curItem.children[z].localName === 'metadata') {
                        curMediaObj.metadata = curItem.children[z].innerHTML;
                    }
                }

                curMediaObj.attributes = {};
                curMediaObj.attributes.streamId = curItem.getAttribute('streamId');
                curMediaObj.attributes.url = curItem.getAttribute('url');
                curMediaObj.attributes.bitrate = curItem.getAttribute('bitrate');
                curMediaObj.attributes.bootstrapInfoId = curItem.getAttribute('bootstrapInfoId');

                simpleXmlObj.media.push(curMediaObj);
            }
        }

        return simpleXmlObj;
    };

 

    utilities.getString = function(object) {
        return trimmed = object.toString().trim();
    };
    
    
    utilities.base64_decode = function(data) {	// Decodes data encoded with MIME base64
        //
        // +   original by: Tyler Akins (http://rumkin.com)


        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, h1, h2, h3, h4, bits, i=0, enc='';

        do {  // unpack four hexets into three octets using index points in b64
            h1 = b64.indexOf(data.charAt(i++));
            h2 = b64.indexOf(data.charAt(i++));
            h3 = b64.indexOf(data.charAt(i++));
            h4 = b64.indexOf(data.charAt(i++));

            bits = h1<<18 | h2<<12 | h3<<6 | h4;

            o1 = bits>>16 & 0xff;
            o2 = bits>>8 & 0xff;
            o3 = bits & 0xff;

            if (h3 == 64)	  enc += String.fromCharCode(o1);
            else if (h4 == 64) enc += String.fromCharCode(o1, o2);
            else			   enc += String.fromCharCode(o1, o2, o3);
        } while (i < data.length);

        return enc;
    };    
    

    utilities.base64_encode = function(data) {	// Encodes data with MIME base64
        //
        // +   original by: Tyler Akins (http://rumkin.com)
        // +   improved by: Bayron Guevara

        var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        var o1, o2, o3, h1, h2, h3, h4, bits, i=0, enc='';

        do { // pack three octets into four hexets
            o1 = data.charCodeAt(i++);
            o2 = data.charCodeAt(i++);
            o3 = data.charCodeAt(i++);

            bits = o1<<16 | o2<<8 | o3;

            h1 = bits>>18 & 0x3f;
            h2 = bits>>12 & 0x3f;
            h3 = bits>>6 & 0x3f;
            h4 = bits & 0x3f;

            // use hexets to index into b64, and append result to encoded string
            enc += b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);

        switch( data.length % 3 ){
            case 1:
                enc = enc.slice(0, -2) + '==';
                break;
            case 2:
                enc = enc.slice(0, -1) + '=';
                break;
        }

        return enc;
    };
    
    
    utilities.is_numeric = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    
    utilities.searchAssociative = function(arr, key) {
        
        var found = false;
        for (var i = 0; i < arr.length; i++) {
            if (arr[i][0] == key) {
                found = true;
                break;
            }
        }
        return found;
    };
    
    utilities.getAssociativeElementByKey = function(arr, key) {
        
        var found = null;
        for (var i = 0; i < arr.length; i++) {                    
            if (arr[i][0] == key) {
                found = arr[i];
                break;
            }
        }
        return found;
    };

    utilities.keyName = function(array, pos) {
        
        var sliced = array[pos];
        if (sliced.length > 0) {
            var key = sliced[0];
            return Number(key);
        }
        return null;
    };
    
    
    
    utilities.unhexlify = function(str) {
        return pack("H*", str);
    };
    
   

})(this.utils = {});

