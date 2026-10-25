// 三年级英语两册书后「Words in each unit」（单元词汇表）：按册、单元分黑体词与白体词（2026-10-25 照平台页图核对）。
// 课本的注：黑体词要求理解、运用，白体词仅要求在语境中理解——所以只有黑体词单独考（听音选词、看图、选意思……），
// 白体词只在句子里出现（E1）。noodle、vegetable 课本写单数（常用复数），这里写材料里用的复数。
export const BOLD: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['ear', 'hand', 'eye', 'mouth', 'arm', 'share', 'smile', 'listen', 'help'],
    2: ['mum', 'dad', 'grandma', 'grandpa', 'grandfather', 'grandmother', 'mother', 'father', 'me', 'sister', 'cousin', 'brother', 'baby', 'uncle', 'aunt'],
    3: ['dog', 'cat', 'fish', 'bird', 'rabbit', 'panda', 'monkey', 'tiger', 'elephant', 'lion'],
    4: ['apple', 'banana', 'air', 'orange', 'grape', 'water', 'flower', 'grass', 'tree', 'sun'],
    5: ['orange', 'green', 'red', 'blue', 'purple', 'brown', 'yellow', 'pink', 'white', 'black'],
    6: ['five', 'one', 'two', 'three', 'four', 'ten', 'six', 'seven', 'eight', 'nine'],
  },
  2: {
    1: ['teacher', 'student', 'girl', 'boy', 'woman', 'man', 'UK', 'China', 'Canada', 'USA'],
    2: ['long', 'short', 'fat', 'thin', 'slow', 'picture', 'card', 'sing', 'dance'],
    3: ['ruler', 'pen', 'pencil', 'book', 'bag', 'paper', 'see', 'smell', 'taste', 'hear', 'touch'],
    4: ['bread', 'egg', 'milk', 'noodles', 'juice', 'rice', 'meat', 'vegetables', 'soup', 'fruit'],
    5: ['boat', 'ball', 'doll', 'car', 'on', 'in', 'cap', 'map', 'under'],
    6: ['fifteen', 'twelve', 'fourteen', 'thirteen', 'eleven', 'twenty', 'seventeen', 'sixteen', 'eighteen', 'nineteen'],
  },
}

export const WHITE: Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>> = {
  1: {
    1: ['name', 'nice', 'can', 'say', 'friend', 'good'],
    2: ['family', 'have', 'big', 'small'],
    3: ['like', 'pet', 'go', 'zoo', 'fox', 'Miss', 'red panda', 'cute', 'animal', 'giraffe', 'tall', 'fast'],
    4: ['farm', 'school', 'garden', 'need', 'plant', 'new', 'give', 'us', 'them'],
    5: ['colour', 'make', 'bear', 'duck', 'sea', 'some', 'draw'],
    6: ['old', 'year', "o'clock", 'cut', 'eat', 'cake'],
  },
  2: {
    1: ['where', 'from', 'about', 'today', 'after', 'who', 'neighbour', 'Mr', 'classmate', 'he', 'also', 'English', 'she', 'very'],
    2: ['has', 'body', 'leg', 'right', 'love', 'tail', 'her', 'gift', 'talk', 'face', 'all', 'song', 'or', 'so', 'much'],
    3: ['eraser', 'find', 'these', 'nose', 'tongue', 'class', 'in class', 'computer', 'learn'],
    4: ['breakfast', 'time', 'healthy', 'plate', 'colourful', 'candy', 'yummy'],
    5: ['cool', 'keep', 'at', 'home', 'shelf', 'box', 'still', 'put'],
    6: ['piggy bank', 'pay', 'back'],
  },
}
