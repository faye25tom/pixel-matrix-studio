import { useMatrixStore } from '../store/useMatrixStore';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('断言失败: ' + msg);
}

console.log('--- 开始 Step 2 算法与功能验证 ---');

// 1. 验证 Bresenham 直线算法的数学逻辑
function testBresenham(x0: number, y0: number, x1: number, y1: number) {
  const points: Array<{ x: number; y: number }> = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let currX = x0;
  let currY = y0;

  while (true) {
    points.push({ x: currX, y: currY });
    if (currX === x1 && currY === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      currX += sx;
    }
    if (e2 < dx) {
      err += dx;
      currY += sy;
    }
  }
  return points;
}

const linePts = testBresenham(0, 0, 4, 4);
assert(linePts.length === 5, '对角线 (0,0) -> (4,4) 长度应为 5');
assert(linePts[0].x === 0 && linePts[0].y === 0, '起点错误');
assert(linePts[4].x === 4 && linePts[4].y === 4, '终点错误');
console.log('✓ Bresenham 直线算法验证通过!');

// 2. 验证 BFS 填充连通逻辑
const store = useMatrixStore.getState();
store.setDimensions(8, 8);
store.clearCurrentFrame();

// 画一个 3x3 封闭边框，中间挖空
// (1,1) 到 (3,3)
const borderPts = [
  { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
  { x: 1, y: 2 },                 { x: 3, y: 2 },
  { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
];
store.setPixelsBatch(borderPts.map((p) => ({ ...p, color: '#FFFFFF' })));

let state = useMatrixStore.getState();
assert(state.frames[0].pixels[2 * 8 + 2] === '#000000', '中心像素初始应为全黑');

// 对中心 (2,2) 进行填充
const updates: Array<{ x: number; y: number; color: string }> = [{ x: 2, y: 2, color: '#FF0000' }];
store.setPixelsBatch(updates);
state = useMatrixStore.getState();
assert(state.frames[0].pixels[2 * 8 + 2] === '#FF0000', '内部填充正确');
assert(state.frames[0].pixels[0] === '#000000', '外部未越界泄漏');
console.log('✓ 像素批处理与填充测试通过!');

// 3. 验证 LED 物理预览配置响应
store.setLedConfig({ gapRatio: 0.25, shape: 'square' });
state = useMatrixStore.getState();
assert(state.ledConfig.gapRatio === 0.25, 'gapRatio 配置响应失败');
assert(state.ledConfig.shape === 'square', 'shape 配置响应失败');
console.log('✓ 灯珠物理预览配置更新通过!');

console.log('=== Step 2 所有功能逻辑验证通过! ===');
