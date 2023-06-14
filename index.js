const Tesseract = require('node-tesseract-ocr');
const fs = require('fs');
const htmlparser = require('htmlparser2');
const { parseDocument } = htmlparser;
const DomUtils = require('domutils');
const gm = require('gm').subClass({ imageMagick: true });

const config = {
  lang: 'eng', // 识别语言
  oem: 1, // OCR引擎模式
  psm: 3, // 页面分割模式
  tessedit_create_hocr: '1', // 生成hOCR输出格式
  tessdata: './tessdata'
};

// 字符串转对象
function parseStrToObj (str) {
  const resultObj = {};
  const arr = str.split(';').filter(v => v !== '');
  for (const v of arr) {
    const [key, ...values] = v.trim().split(' ');
    const val = values.join(' ');
    resultObj[key] = val
  }
  return resultObj;
}


// 读取imgs文件夹下所有的png文件
fs.readdirSync('./imgs').forEach(async (file, i) => {
  console.log('%c file: ', 'background-color: pink', file)
  if (['png', 'jpg', 'jpeg'].includes(file.split('.').pop())) {
    const image = fs.readFileSync(`imgs/${file}`)

    // 读取图片并获取宽高信息
    let imgWidth, imgHeight;
    try {
      gm(image).size(function (err, size) {
        if (!err) {
          imgWidth = size.width;
          imgHeight = size.height;
          console.log('%c imgWidth, imgHeight: ', 'background-color: pink', imgWidth, imgHeight)

          // 调用OCR API进行识别
          Tesseract.recognize(image, config)
            .then((res) => {
              // 将hOCR解析为HTML格式
              const handler = new htmlparser.DefaultHandler();
              const parser = new htmlparser.Parser(handler);
              parser.parseComplete(res);
              const d = handler.dom.find(v => v.type === 'tag');

              // 遍历HTML节点，获取每一行的文本
              const lines = [];
              const traverse = node => {
                if (node.type === 'tag') {
                  if (node.name === 'span' && node.attribs.class === 'ocrx_word') {
                    const word = node.children.filter(child => child.type === 'text')[0].data;
                    const titleObj = parseStrToObj(node.attribs.title);
                    const { bbox, x_wconf } = titleObj;

                    // 正则过滤正常的英文单词+长度大于 2+正确率大于80，不符合条件的将此行删掉
                    if (/[a-z]+[\-\']?[a-z]*/ig.test(word) && word.length > 2 && Number(x_wconf) > 80) {
                      const newWord = word.replace(/@/g, '');
                      lines.push(newWord)

                      const index = node.parent.children.indexOf(node);
                      node.parent.children[index].children[0].data = newWord;
                      // 减掉的是偏移量
                      const top = bbox.split(' ')[1] / imgHeight * 100;
                      const left = bbox.split(' ')[0] / imgWidth * 100;
                      node.attribs.style = `display: inline-block; position: absolute; top: ${top}%; left: ${left}%;background-color: skyblue;padding: 0 3px;border-radius: 3px;border: 1px solid #F56C6C`;
                    } else {
                      const index = node.parent.children.indexOf(node);
                      node.parent.children.splice(index, 1); // 从父节点中删除该节点
                    }
                  } else {
                    node.children.forEach(child => traverse(child));
                  }
                }
              };
              traverse(d);

              // 创建<style>标签，添加所需样式
              const fileName = JSON.parse(JSON.stringify(file))
              const style = `<style>
        html,
        body {
          margin: 0;
          padding: 0;
          width: ${Math.floor(imgWidth / 2)}px;
          height: ${Math.floor(imgHeight / 2)}px;
        }
        body {
          background-image: url('../imgs/${fileName}');
          background-size: cover;
          background-repeat: no-repeat;
        }
        .ocr_page {
          height: 100%;
          width: 100%;
          position: relative;
          margin: 0 auto;
          background-color: rgba(0, 0, 0, 0.3);
        }
      </style>
          `
              const newDom = parseDocument(style);
              const head = d.children.find(node => node.name === 'head');
              head.children.push(newDom);

              // 将处理后的DOM节点对象转换为HTML字符串
              const outputHtml = DomUtils.getOuterHTML(d);
              // 将HTML字符串写入文件中，导出为HTML文件
              fs.writeFileSync(`output/${String(i + 1)}.html`, outputHtml);
            })
            .catch(error => {
              console.error(error);
            });
        }
      });
    } catch (err) {
      console.error(err);
    }
  }
});
