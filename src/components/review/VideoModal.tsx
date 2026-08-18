"use client";

import Modal from "@/components/Modal";

export default function VideoModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <Modal title="معاينة المقطع" onClose={onClose} width={720}>
      <video src={src} controls autoPlay style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
    </Modal>
  );
}
