import React from 'react';

export default function LectureList({ sections = [], currentLectureId, onSelectLecture }) {
  return (
    <div className="divide-y divide-gray-200">
      {sections.map((section) => (
        <div key={section.id} className="py-2">
          <h4 className="font-semibold text-sm px-4 py-2 bg-gray-50">{section.title}</h4>
          <ul>
            {section.lectures?.map((lecture) => (
              <li
                key={lecture.id}
                onClick={() => onSelectLecture(lecture)}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                  lecture.id === currentLectureId ? 'font-medium text-blue-600 bg-blue-50' : 'text-gray-700'
                }`}
              >
                {lecture.title}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
