import NitroModules

/**
 * Manual extensions for C++ std::vector bridge types.
 * We provide a direct 'map' method instead of RandomAccessCollection conformance
 * to avoid complex protocol matching issues with C++ types in Swift.
 */

extension margelo.nitro.speechtotext.bridge.swift.std__vector_std__string_ {
    public var count: Int { Int(self.size()) }
    public var isEmpty: Bool { self.size() == 0 }
    
    public func map<T>(_ transform: (std.string) throws -> T) rethrows -> [T] {
        var result = [T]()
        result.reserveCapacity(self.count)
        for i in 0..<self.count {
            result.append(try transform(self[i]))
        }
        return result
    }
}

extension margelo.nitro.speechtotext.bridge.swift.std__vector_TranscriptionSegment_ {
    public var count: Int { Int(self.size()) }
    public var isEmpty: Bool { self.size() == 0 }

    public func map<T>(_ transform: (margelo.nitro.speechtotext.TranscriptionSegment) throws -> T) rethrows -> [T] {
        var result = [T]()
        result.reserveCapacity(self.count)
        for i in 0..<self.count {
            result.append(try transform(self[i]))
        }
        return result
    }
}
