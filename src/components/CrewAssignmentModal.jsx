import React, { useState, useEffect } from 'react';
import { X, Users, Calendar, MapPin, Plus, Trash2 } from 'lucide-react';

const CrewAssignmentModal = ({ isOpen, onClose, onSave, card, scheduledDate }) => {
  const [availableCrew, setAvailableCrew] = useState([]);

  const [selectedCrew, setSelectedCrew] = useState(card?.assignedCrew || []);
  const [customCrewMember, setCustomCrewMember] = useState('');
  const [notes, setNotes] = useState(card?.crewNotes || '');
  const [equipmentNeeded, setEquipmentNeeded] = useState(card?.equipmentNeeded || '');

  // Function to load personnel data
  const loadPersonnelData = () => {
    const storedPersonnel = localStorage.getItem('kanban_personnel');
    console.log('Loading personnel data:', storedPersonnel); // Debug log

    if (storedPersonnel) {
      try {
        const personnel = JSON.parse(storedPersonnel);
        console.log('Parsed personnel:', personnel); // Debug log

        // Filter personnel by active status
        let filteredPersonnel = personnel.filter(person => person.active);
        console.log('Active personnel:', filteredPersonnel); // Debug log

        // If card has a location, prioritize personnel from that location
        if (card?.location) {
          const locationPersonnel = filteredPersonnel.filter(person => person.location === card.location);
          const otherPersonnel = filteredPersonnel.filter(person => person.location !== card.location);
          filteredPersonnel = [...locationPersonnel, ...otherPersonnel];
        }

        // Format personnel for crew list display
        const formattedCrew = filteredPersonnel.map(person =>
          `${person.name} - ${person.position}${card?.location && person.location !== card.location ? ` (${person.location})` : ''}`
        );

        console.log('Formatted crew:', formattedCrew); // Debug log
        setAvailableCrew(formattedCrew);
      } catch (error) {
        console.error('Error parsing personnel data:', error);
        setAvailableCrew([]);
      }
    } else {
      console.log('No personnel data found, using empty list'); // Debug log
      // Show empty list instead of default crew to encourage setup
      setAvailableCrew([]);
    }
  };

  // Load personnel data when modal opens - refresh every time
  useEffect(() => {
    if (isOpen) {
      // Always reload fresh data when modal opens
      setTimeout(() => {
        loadPersonnelData();
      }, 100); // Small delay to ensure localStorage is updated
    }
  }, [isOpen, card?.location]);

  // Listen for personnel data changes in localStorage
  useEffect(() => {
    if (isOpen) {
      const handleStorageChange = (e) => {
        if (e.key === 'kanban_personnel') {
          loadPersonnelData();
        }
      };

      // Listen for storage changes from other windows/tabs
      window.addEventListener('storage', handleStorageChange);

      // Create a custom event listener for same-window changes
      const handleCustomStorageChange = () => {
        loadPersonnelData();
      };

      window.addEventListener('personnelDataChanged', handleCustomStorageChange);

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('personnelDataChanged', handleCustomStorageChange);
      };
    }
  }, [isOpen, card?.location]);

  const handleAddCrewMember = (member) => {
    if (!selectedCrew.includes(member)) {
      setSelectedCrew([...selectedCrew, member]);
    }
  };

  const handleAddCustomCrewMember = () => {
    if (customCrewMember.trim() && !selectedCrew.includes(customCrewMember.trim())) {
      setSelectedCrew([...selectedCrew, customCrewMember.trim()]);
      setCustomCrewMember('');
    }
  };

  const handleRemoveCrewMember = (member) => {
    setSelectedCrew(selectedCrew.filter(m => m !== member));
  };

  const handleSave = () => {
    onSave({
      assignedCrew: selectedCrew,
      crewNotes: notes,
      equipmentNeeded: equipmentNeeded,
      crewAssignedDate: new Date().toISOString()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-blue-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Assign Crew for Scheduled Job
              </h2>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Scheduled Date: <strong>{scheduledDate ? new Date(scheduledDate).toLocaleDateString() : 'Not set'}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Location: <strong>{card?.location || 'Not specified'}</strong></span>
                </div>
                {card?.title && (
                  <div className="text-gray-700 font-medium mt-2">
                    Project: {card.title}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {/* Selected Crew */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Assigned Crew Members</h3>
            {selectedCrew.length > 0 ? (
              <div className="space-y-2">
                {selectedCrew.map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <span className="font-medium text-gray-700">{member}</span>
                    <button
                      onClick={() => handleRemoveCrewMember(member)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                No crew members assigned yet
              </div>
            )}
          </div>

          {/* Add Crew Members */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Available Crew</h3>
            {availableCrew.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                {availableCrew.map((member) => (
                  <button
                    key={member}
                    onClick={() => handleAddCrewMember(member)}
                    disabled={selectedCrew.includes(member)}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      selectedCrew.includes(member)
                        ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{member}</span>
                      {selectedCrew.includes(member) && (
                        <span className="text-xs text-green-600 font-medium">Assigned</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg text-center mb-4">
                <p className="text-yellow-700 font-medium mb-2">No personnel found in database</p>
                <p className="text-yellow-600 text-sm mb-3">Add personnel in the Setup panel to see them here</p>
                <button
                  onClick={() => {
                    // Force refresh the data
                    setTimeout(loadPersonnelData, 100);
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
                >
                  Refresh List
                </button>
              </div>
            )}

            {/* Add Custom Crew Member */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customCrewMember}
                onChange={(e) => setCustomCrewMember(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCrewMember()}
                placeholder="Add custom crew member..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCustomCrewMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Equipment Needed */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Equipment Needed</h3>
            <textarea
              value={equipmentNeeded}
              onChange={(e) => setEquipmentNeeded(e.target.value)}
              placeholder="List any special equipment or vehicles needed for this job..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Crew Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any special instructions or notes for the crew..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedCrew.length} crew member{selectedCrew.length !== 1 ? 's' : ''} assigned
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Crew Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrewAssignmentModal;