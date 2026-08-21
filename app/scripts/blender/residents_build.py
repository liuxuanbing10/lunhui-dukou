# Blender 无头建模：8 位居民 → app/assets/models/resident_r{n}.glb（真人剪影版）
# ------------------------------------------------------------------
# v2：从"胶囊+球"升级为真人身形 —— 分节双腿(可见)、双臂(整臂旋转关节)、脖颈、头颅、
#     多层蓑衣(草编贴图)、配饰差异。材质用 Seedream 生成的平铺 PBR 贴图。
# 用法：blender.exe --background --python residents_build.py
# 约束：ArmL / ArmR / Head 必须是模型根节点的直接 MeshInstance3D 子节点，
#       供 Godot 侧 ResidentRig 做程序化动画（呼吸/摆手/点头/朝向/命中）。
import bpy
import math
import os

OUT_DIR = r"D:/Projects/lunhui-dukou/app/assets/models"
TEX_DIR = r"D:/Projects/lunhui-dukou/app/assets/textures"
SUOYI = os.path.join(TEX_DIR, "suoyi_albedo.jpg")
SKIN  = os.path.join(TEX_DIR, "skin_albedo.jpg")

def make_mat(name, color, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
    return m

def tex_mat(name, tex_path, rough=0.9):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    img = bpy.data.images.load(tex_path, check_existing=True)
    tt = m.node_tree.nodes.new("ShaderNodeTexImage")
    tt.image = img
    m.node_tree.links.new(tt.outputs["Color"], bsdf.inputs["Base Color"])
    if bsdf:
        bsdf.inputs["Roughness"].default_value = rough
    return m

def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)
    for im in list(bpy.data.images):
        bpy.data.images.remove(im)

def frustum(name, r0, r1, height, y0=0.0, verts=20):
    import bmesh
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
        bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i]))
    bm.normal_update()
    bm.to_mesh(mesh)
    bm.free()
    return obj

def cyl(name, radius, depth, x, z, mat, rot=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth,
                                        location=(x, 0.0, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler[2] = math.radians(rot)
    obj.data.materials.append(mat)
    return obj

def cone(name, radius, depth, z, mat):
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=radius, radius2=0.001,
                                    depth=depth, location=(0.0, 0.0, z))
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def sphere(name, radius, x, z, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=(x, 0.0, z),
                                         segments=16, ring_count=12)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

def link_to_root(root, obj):
    obj.parent = root
    return obj

# 每位居民：id: (蓑衣/外袍色, 肩半径, 底半径, 身高, 帽色|None, 皮肤色, 前倾, 配饰)
RESIDENTS = {
    "r1": ((0.180, 0.290, 0.247), 0.44, 0.30, 1.70, (0.122, 0.196, 0.165), (0.725, 0.541, 0.416), 0, "hat"),
    "r2": ((0.604, 0.420, 0.310), 0.34, 0.46, 1.66, None, (0.891, 0.698, 0.561), 0, "flower"),
    "r3": ((0.722, 0.592, 0.341), 0.48, 0.36, 1.66, None, (0.784, 0.608, 0.435), 0, "apron"),
    "r4": ((0.431, 0.294, 0.227), 0.34, 0.30, 1.62, None, (0.847, 0.706, 0.541), 10, ""),
    "r5": ((0.361, 0.420, 0.451), 0.40, 0.30, 1.66, None, (0.722, 0.604, 0.447), 14, ""),
    "r6": ((0.431, 0.353, 0.243), 0.52, 0.40, 1.74, (0.353, 0.278, 0.173), (0.541, 0.415, 0.259), 0, "net"),
    "r7": ((0.290, 0.353, 0.420), 0.40, 0.34, 1.70, (0.200, 0.200, 0.216), (0.690, 0.541, 0.369), 0, "lantern"),
    "r8": ((0.478, 0.545, 0.431), 0.30, 0.36, 1.30, None, (0.788, 0.659, 0.478), 0, "bundle"),
}

# 身高常量（Blender z 轴向上，鞋底 z=0）
HIP = 0.78      # 胯
CHEST = 1.30    # 胸/肩底
FORE = 1.45     # 肩顶
HEAD_C = 1.72   # 头心
LEG = 0.76      # 腿长

def build(rid):
    clear_scene()
    coat, r0, r1, h, hat, skin, tilt, extra = RESIDENTS[rid]
    # 全局微调比例
    s = h / 1.70                      # 身高缩放（r8 是小孩）
    hip = HIP * s; chest = CHEST * s; fore = FORE * s; headc = HEAD_C * s; leg = LEG * s

    coat_mat = tex_mat("Coat", SUOYI, 0.85)
    skin_mat = tex_mat("Skin", SKIN, 0.6)
    robe_mat = make_mat("Robe", coat, 0.9)                   # 内袍用蓑衣主色
    leg_mat  = make_mat("Legs", tuple(max(0.0, c - 0.08) for c in coat[:3]), 0.9)
    hat_mat  = make_mat("Hat", hat, 0.95) if hat else None

    root = bpy.data.objects.new(f"resident_{rid}", None)
    bpy.context.scene.collection.objects.link(root)

    # --- 双腿（分开，做成关节脚踝不明显，直接两截圆柱+尖脚） ---
    leg_r = r0 * 0.22
    for side, dx in (("L", -0.11), ("R", 0.11)):
        thigh = cyl(f"Leg{side}_thigh", leg_r, leg, dx, leg / 2.0, leg_mat)
        link_to_root(root, thigh)

    # --- 躯干袍身（肩阔到下摆，带轻微前倾） ---
    torso = frustum("Coat", r0, r1, chest - hip, y0=hip, verts=22)
    torso.rotation_euler[1] = math.radians(tilt)
    torso.data.materials.append(coat_mat)
    link_to_root(root, torso)

    # --- 多层蓑衣叶片（从肩向下套 3 层，制造蓑衣蓬松层次） ---
    for i, (rr, zz, dd) in enumerate([(r0 * 1.06, fore - 0.02, 0.42),
                                       (r0 * 0.98, chest - 0.10, 0.38),
                                       (r0 * 0.90, chest - 0.28, 0.34)]):
        leaf = frustum(f"Suoyi{i}", rr * 1.02, rr * 0.94, dd, y0=zz, verts=22)
        leaf.data.materials.append(coat_mat)
        leaf.rotation_euler[1] = math.radians(tilt)
        link_to_root(root, leaf)

    # --- 双臂（整臂 MeshInstance3D，供 Rig 摆动） ---
    for side, dx in (("L", -(r0 * 0.78)), ("R", r0 * 0.78)):
        arm = cyl(f"Arm{side}", 0.055, 0.46 * s, dx, fore - 0.06, robe_mat,
                  rot=-24 if dx > 0 else 24)
        # 手臂根节点上移，使整臂绕肩旋转（Rig 用 z 旋转）
        arm.rotation_euler[2] = math.radians(-24 if dx > 0 else 24)
        # 手
        hand = sphere(f"Hand{side}", 0.05, dx, fore - 0.34, skin_mat)
        link_to_root(root, hand)
        link_to_root(root, arm)

    # --- 脖颈 ---
    neck = cyl("Neck", 0.048, 0.10 * s, 0, fore + 0.02, skin_mat)
    link_to_root(root, neck)

    # --- 头颅（皮肤贴图） ---
    head = sphere("Head", 0.155 * s, 0, headc, skin_mat)
    link_to_root(root, head)

    # --- 斗笠/帽子 ---
    if hat_mat:
        cone("Hat", r0 * 0.62, 0.13 * s, headc + 0.12, hat_mat)
        link_to_root(root, bpy.data.objects.get("Hat"))

    # --- 配饰：象征性占位（球/柱表达角色标签） ---
    if extra == "flower":
        f = sphere("Flower", 0.085, r0 * 0.7, fore + 0.02, make_mat("Flower", (0.910, 0.416, 0.478)))
        link_to_root(root, f)
    elif extra == "apron":
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(r0 * 0.2, 0, hip + 0.28 * s))
        apr = bpy.context.active_object
        apr.name = "Apron"
        apr.scale = (0.24, 0.03, 0.34)
        apr.data.materials.append(make_mat("Apron", (0.941, 0.886, 0.824)))
        link_to_root(root, apr)
    elif extra == "net":
        n = cyl("Net", 0.15, 0.16, r0 * 1.05, hip + 0.30, make_mat("Net", (0.180, 0.290, 0.247)), rot=20)
        link_to_root(root, n)
    elif extra == "lantern":
        l = cyl("Lantern", 0.06, 0.15, r0 * 1.05, chest - 0.1, make_mat("Lantern", (1.0, 0.694, 0.361)), rot=15)
        link_to_root(root, l)
    elif extra == "bundle":
        b = sphere("Bundle", 0.10 * s, r0 * 0.8, hip + 0.25, make_mat("Bundle", (0.847, 0.635, 0.290)))
        link_to_root(root, b)

    # 整身归一化到位
    sel = bpy.context.view_layer.objects
    for o in sel:
        if o.parent is root:
            o.select_set(True)
    root.select_set(True)
    bpy.context.view_layer.objects.active = root

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"resident_{rid}.glb").replace("/", "\\")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB",
                              export_apply=True, use_selection=True)
    print("BLENDER_OK", "resident_" + rid + ".glb",
          os.path.getsize(out))

for rid in RESIDENTS:
    build(rid)
print("ALL_DONE")