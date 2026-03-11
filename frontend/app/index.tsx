import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const TEAM_LOGO_URL = 'https://customer-assets.emergentagent.com/job_youth-football-mgr/artifacts/oe26prbi_image.png';

// Types
interface PositionRating {
  position: string;
  rating: number;
}

interface Player {
  id: string;
  name: string;
  positions: PositionRating[];
  preferred_foot: string;
  is_available: boolean;
}

interface LineupSlot {
  position: string;
  player_id: string | null;
  player_name: string | null;
  rating: number;
  x: number;
  y: number;
}

interface HeatmapZone {
  zone: string;
  avg_rating: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LineupResponse {
  formation: string;
  mode: string;
  lineup: LineupSlot[];
  bench: any[];
  heatmap: HeatmapZone[];
  total_rating: number;
  available_count: number;
}

const POSITIONS = [
  'GK', 'CB', 'RB', 'LB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'
];

const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '5-3-2', '4-1-4-1', '3-4-3'];

export default function Index() {
  const [activeTab, setActiveTab] = useState<'roster' | 'availability' | 'lineup'>('roster');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [addPlayerModal, setAddPlayerModal] = useState(false);
  const [editPlayerModal, setEditPlayerModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Form states
  const [playerName, setPlayerName] = useState('');
  const [playerPositions, setPlayerPositions] = useState<PositionRating[]>([]);
  const [preferredFoot, setPreferredFoot] = useState<'left' | 'right'>('right');
  
  // Lineup states
  const [selectedFormation, setSelectedFormation] = useState('4-4-2');
  const [lineupMode, setLineupMode] = useState<'strength' | 'balanced'>('strength');
  const [lineup, setLineup] = useState<LineupResponse | null>(null);
  const [generatingLineup, setGeneratingLineup] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(true);
  
  // ViewShot ref for capturing lineup
  const lineupViewRef = useRef<ViewShot>(null);
  const [savingLineup, setSavingLineup] = useState(false);
  
  // Recommended formation state
  const [recommendedFormation, setRecommendedFormation] = useState<string | null>(null);
  const [calculatingBest, setCalculatingBest] = useState(false);

  // Calculate best formation based on green zones in heatmap
  const calculateBestFormation = useCallback(async () => {
    const availableCount = players.filter(p => p.is_available).length;
    if (availableCount < 1) {
      setRecommendedFormation(null);
      return;
    }
    
    setCalculatingBest(true);
    
    try {
      const results: { formation: string; greenZones: number; totalRating: number }[] = [];
      
      // Test each formation
      for (const formation of FORMATIONS) {
        try {
          const response = await fetch(`${API_URL}/api/lineup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formation,
              mode: lineupMode
            })
          });
          
          if (response.ok) {
            const data: LineupResponse = await response.json();
            // Count green zones (rating >= 4)
            const greenZones = data.heatmap.filter(zone => zone.avg_rating >= 4).length;
            results.push({
              formation,
              greenZones,
              totalRating: data.total_rating
            });
          }
        } catch (e) {
          console.error(`Error testing formation ${formation}:`, e);
        }
      }
      
      // Find the best formation (most green zones, then highest rating as tiebreaker)
      if (results.length > 0) {
        results.sort((a, b) => {
          if (b.greenZones !== a.greenZones) {
            return b.greenZones - a.greenZones;
          }
          return b.totalRating - a.totalRating;
        });
        setRecommendedFormation(results[0].formation);
      }
    } catch (error) {
      console.error('Error calculating best formation:', error);
    } finally {
      setCalculatingBest(false);
    }
  }, [players, lineupMode]);

  // Recalculate best formation when tab changes to lineup or when players/mode changes
  useEffect(() => {
    if (activeTab === 'lineup') {
      calculateBestFormation();
    }
  }, [activeTab, players, lineupMode, calculateBestFormation]);

  // Fetch players
  const fetchPlayers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/players`);
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Error fetching players:', error);
      Alert.alert('Error', 'Failed to fetch players');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlayers();
  };

  // Add player
  const handleAddPlayer = async () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName.trim(),
          positions: playerPositions,
          preferred_foot: preferredFoot
        })
      });
      
      if (response.ok) {
        setAddPlayerModal(false);
        setPlayerName('');
        setPlayerPositions([]);
        setPreferredFoot('right');
        fetchPlayers();
      } else {
        Alert.alert('Error', 'Failed to add player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      Alert.alert('Error', 'Failed to add player');
    }
  };

  // Update player
  const handleUpdatePlayer = async () => {
    if (!selectedPlayer) return;
    
    try {
      const response = await fetch(`${API_URL}/api/players/${selectedPlayer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName.trim(),
          positions: playerPositions,
          preferred_foot: preferredFoot
        })
      });
      
      if (response.ok) {
        setEditPlayerModal(false);
        setSelectedPlayer(null);
        setPlayerName('');
        setPlayerPositions([]);
        setPreferredFoot('right');
        fetchPlayers();
      } else {
        Alert.alert('Error', 'Failed to update player');
      }
    } catch (error) {
      console.error('Error updating player:', error);
      Alert.alert('Error', 'Failed to update player');
    }
  };

  // Delete player
  const handleDeletePlayer = (playerId: string, playerName: string) => {
    Alert.alert(
      'Delete Player',
      `Are you sure you want to remove ${playerName} from the roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/players/${playerId}`, {
                method: 'DELETE'
              });
              fetchPlayers();
            } catch (error) {
              console.error('Error deleting player:', error);
              Alert.alert('Error', 'Failed to delete player');
            }
          }
        }
      ]
    );
  };

  // Toggle availability
  const toggleAvailability = async (playerId: string, currentStatus: boolean) => {
    try {
      await fetch(`${API_URL}/api/players/${playerId}/availability?is_available=${!currentStatus}`, {
        method: 'PUT'
      });
      fetchPlayers();
    } catch (error) {
      console.error('Error toggling availability:', error);
    }
  };

  // Clear all availability
  const clearAllAvailability = async () => {
    Alert.alert(
      'Clear All Availability',
      'This will untick all players. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const availablePlayers = players.filter(p => p.is_available);
              for (const player of availablePlayers) {
                await fetch(`${API_URL}/api/players/${player.id}/availability?is_available=false`, {
                  method: 'PUT'
                });
              }
              fetchPlayers();
            } catch (error) {
              console.error('Error clearing availability:', error);
              Alert.alert('Error', 'Failed to clear availability');
            }
          }
        }
      ]
    );
  };

  // Generate lineup
  const generateLineup = async () => {
    setGeneratingLineup(true);
    try {
      const response = await fetch(`${API_URL}/api/lineup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation: selectedFormation,
          mode: lineupMode
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setLineup(data);
      } else {
        Alert.alert('Error', 'Failed to generate lineup');
      }
    } catch (error) {
      console.error('Error generating lineup:', error);
      Alert.alert('Error', 'Failed to generate lineup');
    } finally {
      setGeneratingLineup(false);
    }
  };

  // Download/Share lineup as image
  const downloadLineup = async () => {
    if (!lineupViewRef.current) return;
    
    setSavingLineup(true);
    
    // Temporarily hide heatmap for the screenshot
    const originalHeatmapState = showHeatmap;
    setShowHeatmap(false);
    
    // Wait for re-render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const uri = await lineupViewRef.current.capture?.();
      
      if (uri) {
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Save Lineup Image'
          });
        } else {
          // Fallback for web
          if (Platform.OS === 'web') {
            const link = document.createElement('a');
            link.href = uri;
            link.download = `lineup_${selectedFormation}_${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            Alert.alert('Success', 'Lineup image saved!');
          }
        }
      }
    } catch (error) {
      console.error('Error saving lineup:', error);
      Alert.alert('Error', 'Failed to save lineup image');
    } finally {
      // Restore heatmap state
      setShowHeatmap(originalHeatmapState);
      setSavingLineup(false);
    }
  };

  // Toggle position for player
  const togglePosition = (position: string) => {
    const existing = playerPositions.find(p => p.position === position);
    if (existing) {
      setPlayerPositions(playerPositions.filter(p => p.position !== position));
    } else {
      if (playerPositions.length >= 4) {
        Alert.alert('Limit Reached', 'You can only select up to 4 positions');
        return;
      }
      setPlayerPositions([...playerPositions, { position, rating: 3 }]);
    }
  };

  // Update position rating
  const updatePositionRating = (position: string, rating: number) => {
    setPlayerPositions(playerPositions.map(p => 
      p.position === position ? { ...p, rating } : p
    ));
  };

  // Open edit modal
  const openEditModal = (player: Player) => {
    setSelectedPlayer(player);
    setPlayerName(player.name);
    setPlayerPositions(player.positions);
    setPreferredFoot(player.preferred_foot as 'left' | 'right' || 'right');
    setEditPlayerModal(true);
  };

  // Get heatmap color
  const getHeatmapColor = (rating: number) => {
    if (rating === 0) return 'rgba(128, 128, 128, 0.3)';
    if (rating >= 4) return 'rgba(34, 197, 94, 0.6)';
    if (rating >= 3) return 'rgba(234, 179, 8, 0.6)';
    if (rating >= 2) return 'rgba(249, 115, 22, 0.6)';
    return 'rgba(239, 68, 68, 0.6)';
  };

  // Render foot selector
  const renderFootSelector = () => (
    <View style={styles.footSelectorContainer}>
      <Text style={styles.formLabel}>Preferred Foot</Text>
      <View style={styles.footToggle}>
        <TouchableOpacity
          style={[
            styles.footButton,
            preferredFoot === 'left' && styles.footButtonSelected
          ]}
          onPress={() => setPreferredFoot('left')}
        >
          <Ionicons
            name="footsteps"
            size={18}
            color={preferredFoot === 'left' ? '#fff' : '#6b7280'}
            style={{ transform: [{ scaleX: -1 }] }}
          />
          <Text style={[
            styles.footButtonText,
            preferredFoot === 'left' && styles.footButtonTextSelected
          ]}>Left</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.footButton,
            preferredFoot === 'right' && styles.footButtonSelected
          ]}
          onPress={() => setPreferredFoot('right')}
        >
          <Ionicons
            name="footsteps"
            size={18}
            color={preferredFoot === 'right' ? '#fff' : '#6b7280'}
          />
          <Text style={[
            styles.footButtonText,
            preferredFoot === 'right' && styles.footButtonTextSelected
          ]}>Right</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render position form
  const renderPositionForm = () => (
    <View style={styles.positionFormContainer}>
      <Text style={styles.formLabel}>Select Positions (up to 4):</Text>
      <View style={styles.positionsGrid}>
        {POSITIONS.map(pos => {
          const selected = playerPositions.find(p => p.position === pos);
          return (
            <TouchableOpacity
              key={pos}
              style={[
                styles.positionChip,
                selected && styles.positionChipSelected
              ]}
              onPress={() => togglePosition(pos)}
            >
              <Text style={[
                styles.positionChipText,
                selected && styles.positionChipTextSelected
              ]}>{pos}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {playerPositions.length > 0 && (
        <View style={styles.ratingsContainer}>
          <Text style={styles.formLabel}>Set Ratings (1-5):</Text>
          {playerPositions.map(pos => (
            <View key={pos.position} style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>{pos.position}</Text>
              <View style={styles.ratingButtons}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <TouchableOpacity
                    key={rating}
                    style={[
                      styles.ratingButton,
                      pos.rating === rating && styles.ratingButtonSelected
                    ]}
                    onPress={() => updatePositionRating(pos.position, rating)}
                  >
                    <Text style={[
                      styles.ratingButtonText,
                      pos.rating === rating && styles.ratingButtonTextSelected
                    ]}>{rating}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  // Render tabs
  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {(['roster', 'availability', 'lineup'] as const).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Ionicons
            name={
              tab === 'roster' ? 'people' :
              tab === 'availability' ? 'checkbox' : 'football'
            }
            size={20}
            color={activeTab === tab ? '#10b981' : '#9ca3af'}
          />
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render roster tab
  const renderRosterTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Squad Roster</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setPlayerName('');
            setPlayerPositions([]);
            setPreferredFoot('right');
            setAddPlayerModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.playersList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {players.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>No players yet</Text>
            <Text style={styles.emptySubtext}>Add your first player to get started</Text>
          </View>
        ) : (
          players.map(player => (
            <TouchableOpacity
              key={player.id}
              style={styles.playerCard}
              onPress={() => openEditModal(player)}
            >
              <View style={styles.playerInfo}>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <View style={styles.footBadge}>
                    <Ionicons
                      name="footsteps"
                      size={12}
                      color="#10b981"
                      style={player.preferred_foot === 'left' ? { transform: [{ scaleX: -1 }] } : {}}
                    />
                    <Text style={styles.footBadgeText}>
                      {player.preferred_foot === 'left' ? 'L' : 'R'}
                    </Text>
                  </View>
                </View>
                <View style={styles.positionTags}>
                  {player.positions.map(pos => (
                    <View key={pos.position} style={styles.positionTag}>
                      <Text style={styles.positionTagText}>
                        {pos.position} ({pos.rating})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  // Render availability tab
  const renderAvailabilityTab = () => {
    const availableCount = players.filter(p => p.is_available).length;
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>This Week's Availability</Text>
          <View style={styles.availabilityHeaderButtons}>
            {availableCount > 0 && (
              <TouchableOpacity
                style={styles.clearAllButton}
                onPress={clearAllAvailability}
              >
                <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            )}
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{availableCount}/11</Text>
            </View>
          </View>
        </View>
        
        <ScrollView
          style={styles.playersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {players.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>No players in roster</Text>
              <Text style={styles.emptySubtext}>Add players first to mark availability</Text>
            </View>
          ) : (
            players.map(player => (
              <TouchableOpacity
                key={player.id}
                style={styles.availabilityCard}
                onPress={() => toggleAvailability(player.id, player.is_available)}
              >
                <View style={styles.playerInfo}>
                  <View style={styles.playerNameRow}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <View style={styles.footBadgeSmall}>
                      <Text style={styles.footBadgeTextSmall}>
                        {player.preferred_foot === 'left' ? 'L' : 'R'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.positionsText}>
                    {player.positions.map(p => p.position).join(', ') || 'No positions set'}
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  player.is_available && styles.checkboxChecked
                ]}>
                  {player.is_available && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  // Render pitch with players (for ViewShot capture)
  const renderPitch = () => {
    if (!lineup) return null;
    
    return (
      <ViewShot
        ref={lineupViewRef}
        options={{ format: 'png', quality: 0.9 }}
        style={styles.pitchWrapper}
      >
        <View style={styles.pitchContainer}>
          {/* Heatmap overlay - only show when showHeatmap is true */}
          {showHeatmap && lineup.heatmap.map((zone, idx) => (
            <View
              key={idx}
              style={[
                styles.heatmapZone,
                {
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  backgroundColor: getHeatmapColor(zone.avg_rating)
                }
              ]}
            />
          ))}
          
          {/* Pitch markings */}
          <View style={styles.pitchMarkings}>
            <View style={styles.centerCircle} />
            <View style={styles.centerLine} />
            <View style={styles.penaltyBoxTop} />
            <View style={styles.penaltyBoxBottom} />
          </View>
          
          {/* Formation label when saving without heatmap */}
          {!showHeatmap && (
            <View style={styles.formationLabel}>
              <Text style={styles.formationLabelText}>{lineup.formation}</Text>
            </View>
          )}
          
          {/* Player positions */}
          {lineup.lineup.map((slot, idx) => (
            <View
              key={idx}
              style={[
                styles.playerMarker,
                {
                  left: `${slot.x - 8}%`,
                  top: `${slot.y - 5}%`,
                }
              ]}
            >
              <View style={[
                styles.playerDot,
                !slot.player_id && styles.playerDotEmpty
              ]}>
                <Text style={styles.playerDotText}>
                  {slot.player_name ? slot.player_name.charAt(0) : '?'}
                </Text>
              </View>
              <Text style={styles.playerMarkerName} numberOfLines={1}>
                {slot.player_name || 'Empty'}
              </Text>
              <Text style={styles.playerMarkerPos}>
                {slot.position} {slot.rating > 0 ? `(${slot.rating})` : ''}
              </Text>
            </View>
          ))}
        </View>
      </ViewShot>
    );
  };

  // Render lineup tab
  const renderLineupTab = () => {
    const availableCount = players.filter(p => p.is_available).length;
    
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.headerTitle}>Generate Best XI</Text>
        
        {/* Formation selector */}
        <View style={styles.formationHeaderRow}>
          <Text style={styles.sectionLabel}>Formation</Text>
          {calculatingBest && (
            <View style={styles.calculatingBadge}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.calculatingText}>Finding best...</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formationScroll}>
          {FORMATIONS.map(formation => {
            const isRecommended = formation === recommendedFormation;
            const isSelected = selectedFormation === formation;
            return (
              <TouchableOpacity
                key={formation}
                style={[
                  styles.formationButton,
                  isSelected && styles.formationButtonSelected,
                  isRecommended && !isSelected && styles.formationButtonRecommended
                ]}
                onPress={() => setSelectedFormation(formation)}
              >
                {isRecommended && (
                  <View style={styles.recommendedBadge}>
                    <Ionicons name="star" size={10} color="#fbbf24" />
                  </View>
                )}
                <Text style={[
                  styles.formationButtonText,
                  isSelected && styles.formationButtonTextSelected,
                  isRecommended && !isSelected && styles.formationButtonTextRecommended
                ]}>{formation}</Text>
                {isRecommended && (
                  <Text style={[
                    styles.recommendedText,
                    isSelected && styles.recommendedTextSelected
                  ]}>Best</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        {/* Mode toggle */}
        <Text style={styles.sectionLabel}>Selection Mode</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              lineupMode === 'strength' && styles.modeButtonSelected
            ]}
            onPress={() => setLineupMode('strength')}
          >
            <Ionicons
              name="flash"
              size={18}
              color={lineupMode === 'strength' ? '#fff' : '#6b7280'}
            />
            <Text style={[
              styles.modeButtonText,
              lineupMode === 'strength' && styles.modeButtonTextSelected
            ]}>Strongest XI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              lineupMode === 'balanced' && styles.modeButtonSelected
            ]}
            onPress={() => setLineupMode('balanced')}
          >
            <Ionicons
              name="scale"
              size={18}
              color={lineupMode === 'balanced' ? '#fff' : '#6b7280'}
            />
            <Text style={[
              styles.modeButtonText,
              lineupMode === 'balanced' && styles.modeButtonTextSelected
            ]}>Balanced</Text>
          </TouchableOpacity>
        </View>
        
        {/* Generate button */}
        <TouchableOpacity
          style={[
            styles.generateButton,
            availableCount < 1 && styles.generateButtonDisabled
          ]}
          onPress={generateLineup}
          disabled={generatingLineup || availableCount < 1}
        >
          {generatingLineup ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="football" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>
                Generate Lineup ({availableCount} available)
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Lineup display */}
        {lineup && (
          <>
            <View style={styles.lineupHeader}>
              <View>
                <Text style={styles.lineupTitle}>
                  {lineup.formation} - {lineup.mode === 'strength' ? 'Strongest' : 'Balanced'}
                </Text>
                <Text style={styles.lineupRating}>
                  Avg Rating: {lineup.total_rating.toFixed(1)}/5
                </Text>
              </View>
              
              {/* Download Button */}
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={downloadLineup}
                disabled={savingLineup}
              >
                {savingLineup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={18} color="#fff" />
                    <Text style={styles.downloadButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Heatmap toggle */}
            <View style={styles.heatmapToggleContainer}>
              <Text style={styles.heatmapToggleLabel}>Show Heatmap</Text>
              <TouchableOpacity
                style={[
                  styles.heatmapToggle,
                  showHeatmap && styles.heatmapToggleOn
                ]}
                onPress={() => setShowHeatmap(!showHeatmap)}
              >
                <View style={[
                  styles.heatmapToggleKnob,
                  showHeatmap && styles.heatmapToggleKnobOn
                ]} />
              </TouchableOpacity>
            </View>
            
            {/* Heatmap legend - only show when heatmap is visible */}
            {showHeatmap && (
              <View style={styles.legendContainer}>
                <Text style={styles.legendTitle}>Strength Map:</Text>
                <View style={styles.legendItems}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: 'rgba(34, 197, 94, 0.6)' }]} />
                    <Text style={styles.legendText}>Strong (4-5)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: 'rgba(234, 179, 8, 0.6)' }]} />
                    <Text style={styles.legendText}>Decent (3)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: 'rgba(249, 115, 22, 0.6)' }]} />
                    <Text style={styles.legendText}>Weak (2)</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: 'rgba(239, 68, 68, 0.6)' }]} />
                    <Text style={styles.legendText}>Very Weak (1)</Text>
                  </View>
                </View>
              </View>
            )}
            
            {renderPitch()}
            
            {/* Bench */}
            {lineup.bench.length > 0 && (
              <View style={styles.benchSection}>
                <Text style={styles.benchTitle}>Bench ({lineup.bench.length})</Text>
                <View style={styles.benchPlayers}>
                  {lineup.bench.map(player => (
                    <View key={player.id} style={styles.benchPlayer}>
                      <Text style={styles.benchPlayerName}>{player.name}</Text>
                      <Text style={styles.benchPlayerPositions}>
                        {player.positions.map((p: PositionRating) => p.position).join(', ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={{ uri: TEAM_LOGO_URL }} 
            style={styles.teamLogo}
          />
          <View>
            <Text style={styles.title}>Team Manager</Text>
            <Text style={styles.subtitle}>{players.length} Players</Text>
          </View>
        </View>
      </View>
      
      {renderTabs()}
      
      {activeTab === 'roster' && renderRosterTab()}
      {activeTab === 'availability' && renderAvailabilityTab()}
      {activeTab === 'lineup' && renderLineupTab()}
      
      {/* Add Player Modal */}
      <Modal
        visible={addPlayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setAddPlayerModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Player</Text>
              <TouchableOpacity onPress={handleAddPlayer}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>Player Name</Text>
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Enter player name"
                placeholderTextColor="#9ca3af"
              />
              
              {renderFootSelector()}
              {renderPositionForm()}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Edit Player Modal */}
      <Modal
        visible={editPlayerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditPlayerModal(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Player</Text>
              <TouchableOpacity onPress={handleUpdatePlayer}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>Player Name</Text>
              <TextInput
                style={styles.input}
                value={playerName}
                onChangeText={setPlayerName}
                placeholder="Enter player name"
                placeholderTextColor="#9ca3af"
              />
              
              {renderFootSelector()}
              {renderPositionForm()}
              
              {/* Delete Player Button */}
              <TouchableOpacity
                style={styles.deletePlayerButton}
                onPress={() => {
                  if (selectedPlayer) {
                    handleDeletePlayer(selectedPlayer.id, selectedPlayer.name);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.deletePlayerButtonText}>Delete Player</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#374151',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 14,
    marginLeft: 6,
  },
  activeTabText: {
    color: '#10b981',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#10b981',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    color: '#fff',
    fontWeight: '600',
  },
  playersList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 18,
    marginTop: 12,
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  playerCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  footBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '600',
  },
  footBadgeSmall: {
    backgroundColor: '#374151',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  footBadgeTextSmall: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  positionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  positionTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  positionTagText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  availabilityCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  positionsText: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  formationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  calculatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calculatingText: {
    color: '#10b981',
    fontSize: 12,
  },
  formationScroll: {
    flexGrow: 0,
  },
  formationButton: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    position: 'relative',
    alignItems: 'center',
  },
  formationButtonSelected: {
    backgroundColor: '#10b981',
  },
  formationButtonRecommended: {
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  formationButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  formationButtonTextSelected: {
    color: '#fff',
  },
  formationButtonTextRecommended: {
    color: '#fbbf24',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  recommendedText: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  recommendedTextSelected: {
    color: '#fff',
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  modeButtonSelected: {
    backgroundColor: '#10b981',
  },
  modeButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  modeButtonTextSelected: {
    color: '#fff',
  },
  generateButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#374151',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  lineupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  lineupTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  lineupRating: {
    color: '#10b981',
    fontSize: 14,
    marginTop: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  heatmapToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  heatmapToggleLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  heatmapToggle: {
    width: 48,
    height: 28,
    backgroundColor: '#4b5563',
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  heatmapToggleOn: {
    backgroundColor: '#10b981',
  },
  heatmapToggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  heatmapToggleKnobOn: {
    alignSelf: 'flex-end',
  },
  legendContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  legendTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  pitchWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  pitchContainer: {
    backgroundColor: '#166534',
    borderRadius: 12,
    height: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  pitchMarkings: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginTop: -30,
    marginLeft: -30,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  penaltyBoxTop: {
    position: 'absolute',
    top: 0,
    left: '20%',
    width: '60%',
    height: '15%',
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  penaltyBoxBottom: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    width: '60%',
    height: '15%',
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  formationLabel: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  formationLabelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  heatmapZone: {
    position: 'absolute',
  },
  playerMarker: {
    position: 'absolute',
    alignItems: 'center',
    width: '16%',
  },
  playerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#10b981',
  },
  playerDotEmpty: {
    backgroundColor: '#6b7280',
    borderColor: '#ef4444',
  },
  playerDotText: {
    color: '#111827',
    fontWeight: 'bold',
    fontSize: 14,
  },
  playerMarkerName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  playerMarkerPos: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    textAlign: 'center',
  },
  benchSection: {
    marginTop: 20,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
  },
  benchTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  benchPlayers: {
    gap: 8,
  },
  benchPlayer: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
  },
  benchPlayerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  benchPlayerPositions: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  modalCancel: {
    color: '#ef4444',
    fontSize: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  formLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  footSelectorContainer: {
    marginBottom: 16,
  },
  footToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  footButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  footButtonSelected: {
    backgroundColor: '#10b981',
  },
  footButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  footButtonTextSelected: {
    color: '#fff',
  },
  positionFormContainer: {
    marginTop: 8,
  },
  positionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  positionChip: {
    backgroundColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  positionChipSelected: {
    backgroundColor: '#10b981',
  },
  positionChipText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  positionChipTextSelected: {
    color: '#fff',
  },
  ratingsContainer: {
    marginTop: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    width: 50,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonSelected: {
    backgroundColor: '#10b981',
  },
  ratingButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingButtonTextSelected: {
    color: '#fff',
  },
});
