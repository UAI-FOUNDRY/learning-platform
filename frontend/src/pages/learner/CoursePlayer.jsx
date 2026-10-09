import React from 'react';
import VideoPlayer from '../../components/video/VideoPlayer';
import LectureList from '../../components/video/LectureList';

export default function CoursePlayer() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 min-h-screen">
      <div className="lg:col-span-3 bg-black flex flex-col justify-center">
        <VideoPlayer />
      </div>
      <div className="bg-white border-l p-4 overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">Course Curriculum</h3>
        <LectureList sections={[]} />
      </div>
    </div>
  );
}
