# 行星模型导入指南 (Planet Model Import Guide)

这个文件夹结构是为了支持你从 Blender 导入 3D 模型而设计的。

## 如何导入模型 (.glb)

1. **准备模型**：
   - 在 Blender 中创建你的行星模型。
   - 确保模型的中心点位于原点 (0,0,0)。
   - 导出为 **.glb** 格式（建议勾选 "Apply Modifiers"）。
   - 如果你有城市灯光贴图，请将其连接到 Blender 材质的 **Emissive** 通道。

2. **放置文件**：
   - 将导出的 `.glb` 文件放入 `public/models/` 文件夹下（如果没有请创建）。

3. **修改代码**：
   - 进入对应行星的文件夹（如 `src/planets/Earth/index.js`）。
   - 取消 `this.loadModel` 这一行的注释，并确保路径正确。
   - 示例：
     ```javascript
     this.loadModel('/models/earth.glb', dayTexture, nightTexture);
     ```

## 城市灯光 (City Lights)

代码中内置的 `BasePlanet` 加载器会自动检测模型材质：
- 它会将模型的 **Base Color** 贴图作为白天贴图。
- 它会将模型的 **Emissive** 贴图作为夜间灯光贴图。
- 它会自动应用一个特殊的 Shader，使得灯光只在地球的背阳面（黑夜侧）亮起。

## 注意事项

- **UV 映射**：确保你的模型有正确的 UV 展开。
- **网格与 POI**：代码会自动将现有的经纬度网格和 POI 标记挂载到你的 3D 模型上。
- **性能**：建议模型面数不要过高，以保证在浏览器中运行流畅。
