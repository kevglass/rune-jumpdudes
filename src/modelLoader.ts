import {
  AnimationMixer,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three"
import { ASSETS } from "./lib/assets"
import { GLTFLoader, GLTF, SkeletonUtils } from "three/examples/jsm/Addons.js"

const gltfLoader = new GLTFLoader()
const textureLoader = new TextureLoader()
const mixers: AnimationMixer[] = []

function check(ref: string) {
  if (!ASSETS[ref]) {
    throw new Error("Couldn't find: " + ref)
  }
}

export function loadTexture(ref: string): Promise<Texture> {
  check(ref)

  return new Promise<Texture>((resolve) => {
    textureLoader.load(ASSETS[ref], (texture) => {
      resolve(texture)
    })
  })
}

export function copyGLTF(template: GLTF): Object3D {
  const copy = SkeletonUtils.clone(template.scene)
  let mat: MeshBasicMaterial

  template.scene.traverse((t) => {
    if (t instanceof Mesh) {
      mat = t.material
    }
  })
  copy.traverse((child) => {
    if (child instanceof Mesh) {
      child.material = mat
    }
  })
  copy.animations.push(...template.animations)
  return copy
}

export function getAnimationsGLTF(template: GLTF): string[] {
  return template.animations.map((anim) => anim.name)
}

export function loadModelGLTF(ref: string, texture?: string): Promise<GLTF> {
  check(ref)
  return new Promise<GLTF>((resolve) => {
    gltfLoader.load(ASSETS[ref], (model) => {
      console.log("Loaded: " + ref)
      model.scene.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = true
          child.receiveShadow = true
          const mat = child.material
          child.material = new MeshLambertMaterial()
          child.material.map = mat.map
        }
        if (texture) {
          loadTexture(texture).then((t) => {
            t.colorSpace = SRGBColorSpace
            t.flipY = false
            model.scene.traverse((child) => {
              if (child instanceof Mesh) {
                child.material.map = t
              }
            })
            resolve(model)
          })
        } else {
          resolve(model)
        }
      })
    })
  })
}

export function animateGLTF(model: Object3D, animationName: string): void {
  let mixer = model.userData["mixer"] as AnimationMixer
  if (!mixer) {
    mixer = model.userData["mixer"] = new AnimationMixer(model)
    mixers.push(mixer)
  }

  const clip = model.animations.find((a) => a.name === animationName)
  if (!clip) {
    console.log("Couldn't find animation: " + clip)
    return
  }

  if (model.userData.animation === animationName) {
    return
  }
  model.userData.animation = animationName
  mixer.stopAllAction()
  const action = mixer.clipAction(clip)
  action.play()
  mixer.update(Math.random() * 500)
}

export function updateAnimations(delta: number): void {
  for (const mixer of mixers) {
    mixer.update(delta)
  }
}
