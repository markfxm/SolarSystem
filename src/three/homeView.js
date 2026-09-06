// Shared by the opening flight and the existing Home camera transition.
export const HOME_CAMERA_POSITION = [-160, 210, 680]
export const HOME_CAMERA_TARGET = [-160, 0, 0]

export function getHomeView(aspect) {
  return aspect < 0.85
    ? { position: [-25, 310, 680], target: [-25, 110, 0] }
    : { position: HOME_CAMERA_POSITION, target: HOME_CAMERA_TARGET }
}
