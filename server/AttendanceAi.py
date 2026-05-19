import insightface
import cv2
import numpy as np

app = insightface.app.FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=0, det_size=(640, 640))


class AttendanceAI:

    def single_face_embedding_extraction(self, image_bytes):
        try:
            np_arr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if image is None:
                raise Exception("Invalid image")
            face = app.get(image)

            if len(face) > 1:
                raise Exception("Multiple faces")

            elif len(face) == 0:
                raise Exception("No face detected")

            embedding = face[0].embedding

            return embedding
        except:
            raise Exception("Unable to extract embeddings")

    def multiple_face_embedding_extraction(self, image_bytes):
        try:
            np_arr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            if image is None:
                raise Exception("Invalid image")
            faces = app.get(image)
            if not faces:
                raise Exception("No face detected")
            else:
                return faces
        except Exception as e:
            raise Exception(str(e) if str(e) else "unable to extract faces")
