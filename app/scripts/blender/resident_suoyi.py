# Blender 无头建模：蓑衣人(r1) → app/assets/models/resident_r1.glb
# ------------------------------------------------------------------
# 用法（Windows）：
#   blender.exe --background --python resident_suoyi.py
# 说明：低多边形风格化「蓑衣人」（锥形蓑衣 + 斗笠 + 头 + 手臂占位），
#       单一 PBR 材质；导出 GLB 进入 Godot（R4：只留 glb 进游戏）。
#       纯脚本可复现，运行环境无需打开 Blender GUI。
import bpy
import bmesh
import math
import os

OUT = r"D:/Projects/lunhui-dukou/app/assets/models/resident_r1.glb"

COAT = (0.180, 0.290, 0.247)   # 破蓑衣深青 #2E4A3F
HAT  = (0.122, 0.196, 0.165)   # 斗笠深褐绿
SKIN = (0.725, 0.541, 0.416)   # 肤色
ARM  = (0.18, 0.29, 0.247)     # 蒿草熏袖（同蓑衣）

def make_mat(name, color, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
    return m

def frustum(name, r0, r1, height, y0=0.0, verts=24):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    bm = bmesh.new()
    ring0, ring1 = [], []
    for i in range(verts):
        a = 2 * math.pi * i / verts
        ring0.append(bm.verts.new((r0 * math.cos(a), r0 * math.sin(a), y0)))
        ring1.append(bm.verts.new((r1 * math.cos(a), r1 * math.sin(a), y0 + height)))
    bm.verts.ensure_lookup_table()
    for i in range(verts):
        j = (i + 1) % verts
        bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i]))  # 侧壁（外法线）
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj

def cone(name, radius, depth, z, mat):
    bpy.ops.mesh.primitive_cone_add(vertices=20, radius1=radius, radius2=0.001,
                                    depth=depth, location=(0.0, 0.0, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def sphere(name, radius, z, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=(0.0, 0.0, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

# 清场：只保留需要的模型
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)

coat_mat = make_mat("Coat", COAT)
hat_mat = make_mat("Hat", HAT)
skin_mat = make_mat("Skin", SKIN)

# 蓑衣（上收下敞的锥形）
coat = frustum("Coat", r0=0.42, r1=0.26, height=1.05, y0=0.0)
coat.data.materials.append(coat_mat)

# 斗笠（浅锥）
cone("Hat", radius=0.44, depth=0.16, z=1.70, mat=hat_mat)

# 头（藏在斗笠下）
sphere("Head", radius=0.17, z=1.56, mat=skin_mat)

# 简易手臂占位（两个短圆柱，藏进蓑衣线）
for side, dx in (("L", -0.30), ("R", 0.30)):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.07, depth=0.34,
                                        location=(dx, 0.0, 1.10))
    arm = bpy.context.active_object
    arm.name = f"Arm{side}"
    arm.rotation_euler[0] = math.radians(12)
    arm.rotation_euler[2] = math.radians(-20 if dx > 0 else 20)
    arm.data.materials.append(make_mat(f"Arm{side}", ARM))

# 若导出目录不存在则创建
os.makedirs(os.path.dirname(OUT), exist_ok=True)

# GLB 导出（glTF 默认 y_up 且应用变换，Godot 直接可用）
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB")
print("BLENDER_OK", OUT, os.path.getsize(OUT))